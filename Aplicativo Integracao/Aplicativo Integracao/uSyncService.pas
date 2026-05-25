unit uSyncService;

interface

uses
  System.SysUtils, System.JSON, System.Variants, FireDAC.Comp.Client, uFinanceHubAPI, uDM, FireDAC.DApt,
  System.Generics.Collections, Data.DB, FireDAC.Stan.Option;

type
  TSyncService = class
  private
    FAPI: TFinanceHubAPI;
    FDB: TFDConnection;
    FOnLog: TProc<string>;
    FOnProgress: TProc<string, Integer, Integer>;
    procedure Log(const AMsg: string);
    procedure Progress(const AMsg: string; ACurrent, ATotal: Integer);
  public
    constructor Create(AAPI: TFinanceHubAPI; ADB: TFDConnection);
    
    property OnLog: TProc<string> read FOnLog write FOnLog;
    property OnProgress: TProc<string, Integer, Integer> read FOnProgress write FOnProgress;

    function SyncCompany(ACodEmp: Integer): Boolean;
    procedure EnsureCompanyContext(ACodEmp: Integer);
    function SyncAccounts(ACodEmp: Integer): Integer;
    function SyncCostCenters(ACodEmp: Integer): Integer;
    function SyncChartAccounts(ACodEmp: Integer): Integer;
    function SyncCustomers(ACodEmp: Integer): Integer;
    function SyncCustomerClassifications(ACodEmp: Integer): Integer;
    function SyncCustomerDeactivationReasons(ACodEmp: Integer): Integer;
    function SyncCustomerDeactivationHistory(ACodEmp: Integer): Integer;
    function SyncSuppliers(ACodEmp: Integer): Integer;
    function SyncProductSections(ACodEmp: Integer): Integer;
    function SyncProductGroups(ACodEmp: Integer): Integer;
    function SyncProductSubgroups(ACodEmp: Integer): Integer;
    function SyncProductManufacturers(ACodEmp: Integer): Integer;
    function SyncProducts(ACodEmp: Integer): Integer;
    function SyncPaymentTerms(ACodEmp: Integer): Integer;
    function SyncPaymentMethods(ACodEmp: Integer): Integer;
    function SyncSellers(ACodEmp: Integer): Integer;
    function SyncCashiers(ACodEmp: Integer): Integer;
    function SyncSales(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime): Integer;
    function SyncApTitles(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime; ADateKind: Integer): Integer;
    function SyncArTitles(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime; ADateKind: Integer): Integer;
    function SyncLancamentos(ACodEmp: Integer): Integer;
    function SyncLancamentosCentroCusto(ACodEmp: Integer): Integer;
    function SyncAtendimentos(ACodEmp: Integer; AMySQLDB: TFDConnection; ADateFrom, ADateTo: TDateTime): Integer;
  end;

implementation

function TSyncService.SyncPaymentTerms(ACodEmp: Integer): Integer;
begin
  Result := 0;
  // Implementar
end;

constructor TSyncService.Create(AAPI: TFinanceHubAPI; ADB: TFDConnection);
begin
  FAPI := AAPI;
  FDB := ADB;
end;

procedure TSyncService.Log(const AMsg: string);
begin
  if Assigned(FOnLog) then
    FOnLog(AMsg);
end;

procedure TSyncService.Progress(const AMsg: string; ACurrent, ATotal: Integer);
begin
  if Assigned(FOnProgress) then
    FOnProgress(AMsg, ACurrent, ATotal);
end;

function TSyncService.SyncCompany(ACodEmp: Integer): Boolean;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LResp: TJSONValue;
  LFinanceHubId: string;
  LCnpjRaw: string;
  LCnpjNorm: string;

  function NormalizeDoc(const S: string): string;
  var
    C: Char;
  begin
    Result := '';
    for C in S do
      if CharInSet(C, ['0'..'9']) then
        Result := Result + C;
  end;
begin
  Result := False;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT * FROM EMPRESA WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    
    if not Q.IsEmpty then
    begin
      LObj := TJSONObject.Create;
      try
        LObj.AddPair('externalId', Q.FieldByName('COD_EMP').AsString);
        LObj.AddPair('name', Q.FieldByName('RAZAO_EMP').AsString);
        LCnpjRaw := Trim(Q.FieldByName('CNPJ_EMP').AsString);
        LCnpjNorm := NormalizeDoc(LCnpjRaw);
        if LCnpjNorm <> '' then
          LObj.AddPair('cnpj', LCnpjNorm)
        else
          LObj.AddPair('cnpj', TJSONNull.Create);
        LObj.AddPair('email', Q.FieldByName('EMAIL').AsString);
        LObj.AddPair('phone', Q.FieldByName('TEL_EMP').AsString);
        Log(Format('Empresa %d CNPJ_EMP: %s -> %s', [ACodEmp, LCnpjRaw, LCnpjNorm]));
        
        // Sincroniza e obtém o ID do FinanceHub
        Result := FAPI.SyncCompany(LObj, LFinanceHubId);
        
        if Result and (LFinanceHubId <> '') then
        begin
          // Define o ID da empresa para as próximas requisições
          FAPI.SetCompanyId(LFinanceHubId);
          Log('Contexto FinanceHub companyId: ' + LFinanceHubId);
        end;
      finally
        LObj.Free;
      end;
    end
    else
    begin
      Log('Empresa não encontrada no banco de dados local.');
    end;
  finally
    Q.Free;
  end;
end;

procedure TSyncService.EnsureCompanyContext(ACodEmp: Integer);
var
  Q: TFDQuery;
  LFinanceHubId, LCnpj: string;
begin
  // Se já tivermos o ID da empresa configurado na API, e for o mesmo contexto, ok.
  // Mas como o FCompanyId é privado na API e não temos getter fácil, vamos resolver sempre.
  // Ideal seria cachear no serviço.
  
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT CNPJ_EMP FROM EMPRESA WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    
    if not Q.IsEmpty then
    begin
      LCnpj := Q.FieldByName('CNPJ_EMP').AsString;
      // Tenta resolver ID via API (GET)
      LFinanceHubId := FAPI.ResolveCompanyId(LCnpj);
      
      if LFinanceHubId <> '' then
        FAPI.SetCompanyId(LFinanceHubId)
      else
        Log('AVISO: Não foi possível resolver o ID da empresa ' + LCnpj + '. Sincronize o cadastro da empresa primeiro.');
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncAccounts(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    // Seleciona contas bancárias
    // A tabela CONTAS_CORRENTE no ERP parece não ter COD_EMP explícito na definição fornecida.
    // Se for tabela global, todas as contas serão importadas para a empresa conectada.
    Q.SQL.Text := 'SELECT COD_CONTA, NOME_CONTA, ATIVO FROM CONTAS_CORRENTE';
    
    Q.Open;
    
    while not Q.Eof do
    begin
      LObj := TJSONObject.Create;
      try
        // Mapeamento para API /accounts
        // code: COD_CONTA (string) - identificador amigável
        // description: NOME_CONTA
        // externalCode: COD_CONTA (para vínculo)
        // active: ATIVO = 'S'
        
        LObj.AddPair('code', Q.FieldByName('COD_CONTA').AsString);
        LObj.AddPair('description', Q.FieldByName('NOME_CONTA').AsString);
        LObj.AddPair('externalCode', Q.FieldByName('COD_CONTA').AsString);
        
        if Q.FieldByName('ATIVO').AsString = 'S' then
           LObj.AddPair('active', TJSONBool.Create(True))
        else
           LObj.AddPair('active', TJSONBool.Create(False));
        
        // Outros campos opcionais que a API aceita
        LObj.AddPair('useInCashFlow', TJSONBool.Create(True));
        
        if FAPI.SyncAccount(LObj) then
          Inc(Result);
      finally
        LObj.Free;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncCostCenters(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT COD_CENTAL_CUSTOS, DESCRICAO, UPDATE_AT FROM CENTRAL_DE_CUSTOS';
    
    Q.Open;
    
    while not Q.Eof do
    begin
      LObj := TJSONObject.Create;
      try
        LObj.AddPair('code', Q.FieldByName('COD_CENTAL_CUSTOS').AsString);
        LObj.AddPair('externalCode', Q.FieldByName('COD_CENTAL_CUSTOS').AsString);
        LObj.AddPair('description', Q.FieldByName('DESCRICAO').AsString);
        LObj.AddPair('active', TJSONBool.Create(True));
        
        if FAPI.SyncCostCenter(LObj) then
          Inc(Result);
      finally
        LObj.Free;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncChartAccounts(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LValStr, LConta, LParentCode, LCode: string;
  LLen: Integer;
  LCacheIDs: TDictionary<string, string>;
  LNewID: string;
begin
  Result := 0;
  LCacheIDs := TDictionary<string, string>.Create;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    // Ordenar por CONTA para garantir que contas pai sejam processadas antes das filhas
    Q.SQL.Text := 'SELECT * FROM CENTRO_CUSTO ORDER BY CONTA'; 
    
    Q.Open;
    
    while not Q.Eof do
    begin
      LObj := TJSONObject.Create;
      try
        LConta := Trim(Q.FieldByName('CONTA').AsString);
        LLen := Length(LConta);
        
        LObj.AddPair('code', LConta);
        LObj.AddPair('description', Q.FieldByName('DESCRICAO').AsString);
        LObj.AddPair('accountingCode', Q.FieldByName('COD_CONTABIL').AsString);
        
        // Mapeamento de Tipo (Sintética/Analítica)
        LValStr := UpperCase(Q.FieldByName('TIPO').AsString);
        if (LValStr = 'S') then
          LObj.AddPair('planType', 'SINTETICA')
        else if (LValStr = 'A') then
          LObj.AddPair('planType', 'ANALITICA')
        else
          LObj.AddPair('planType', 'ANALITICA'); 

        // Definição de Hierarquia via parentId
        if LLen > 1 then
        begin
          if LLen = 3 then
            LParentCode := Copy(LConta, 1, 1) // Pai é o primeiro dígito
          else if LLen > 3 then
            LParentCode := Copy(LConta, 1, 3); // Pai são os 3 primeiros dígitos
            
          if (LParentCode <> '') and LCacheIDs.ContainsKey(LParentCode) then
            LObj.AddPair('parentId', LCacheIDs[LParentCode]);
        end;
        
        // Mapeamento Receita/Despesa
        LValStr := UpperCase(Q.FieldByName('RECEITA_DESPESA').AsString);
        if (LValStr = 'R') or (LValStr = 'RECEITA') then
          LObj.AddPair('revenueExpense', 'RECEITA')
        else
          LObj.AddPair('revenueExpense', 'DESPESA');
          
        // Mapeamento Débito/Crédito (CORRIGIDO: 1=Crédito, 0=Débito)
        if (Q.FieldByName('DEBCRED').AsInteger = 1) then
           LObj.AddPair('debitCredit', 'CREDITO')
        else
           LObj.AddPair('debitCredit', 'DEBITO');

        // Mapeamento Custo/Despesa (CHAR)
        LValStr := UpperCase(Q.FieldByName('CUSTO_DESPESA').AsString);
        if (LValStr = 'C') then
           LObj.AddPair('costExpense', 'CUSTO')
        else if (LValStr = 'D') then
           LObj.AddPair('costExpense', 'DESPESA');
           // Se for 'N' ou vazio, não adiciona (fica null)

        // Mapeamento Fixo/Variável (CHAR)
        LValStr := UpperCase(Q.FieldByName('FIXO_VARIAVEL').AsString);
        if (LValStr = 'F') then
           LObj.AddPair('fixedVariable', 'FIXO')
        else
           LObj.AddPair('fixedVariable', 'VARIAVEL');

        // Ativo
        LValStr := UpperCase(Q.FieldByName('ATIVO').AsString);
        if (LValStr = 'S') or (LValStr = 'Y') or (LValStr = '1') then
           LObj.AddPair('active', TJSONBool.Create(True))
        else
           LObj.AddPair('active', TJSONBool.Create(False));

        // Campos DRE e Fluxo de Caixa
        // CONTA_INVESTIMENTO -> dreGroupInvestments
        if UpperCase(Q.FieldByName('CONTA_INVESTIMENTO').AsString) = 'S' then
           LObj.AddPair('dreGroupInvestments', TJSONBool.Create(True));

        // CONTA_IMPOSTO -> dreGroupDeductionsTaxes
        if UpperCase(Q.FieldByName('CONTA_IMPOSTO').AsString) = 'S' then
           LObj.AddPair('dreGroupDeductionsTaxes', TJSONBool.Create(True));

        // RECEITA_FINANCEIRA -> dreGroupOtherFinIncome
        if UpperCase(Q.FieldByName('RECEITA_FINANCEIRA').AsString) = 'S' then
           LObj.AddPair('dreGroupOtherFinIncome', TJSONBool.Create(True));

        // NAO_EXIBIR_PLANO_CONTAS_DRE -> dreHide
        if UpperCase(Q.FieldByName('NAO_EXIBIR_PLANO_CONTAS_DRE').AsString) = 'S' then
           LObj.AddPair('dreHide', TJSONBool.Create(True));

        // OUTRAS_DESPESAS_COMERCIALIZACAO -> dreGroupSalesMarketing
        if UpperCase(Q.FieldByName('OUTRAS_DESPESAS_COMERCIALIZACAO').AsString) = 'S' then
           LObj.AddPair('dreGroupSalesMarketing', TJSONBool.Create(True));

        // PARTICIPACAO_LUCRO -> dreGroupProfitSharing
        if UpperCase(Q.FieldByName('PARTICIPACAO_LUCRO').AsString) = 'S' then
           LObj.AddPair('dreGroupProfitSharing', TJSONBool.Create(True));

        // NAO_EXIBIR_PLANO_CONTAS_FLUXO_C -> cashflowHide
        if UpperCase(Q.FieldByName('NAO_EXIBIR_PLANO_CONTAS_FLUXO_C').AsString) = 'S' then
           LObj.AddPair('cashflowHide', TJSONBool.Create(True));
           
        if FAPI.SyncChartAccount(LObj, LNewID) then
        begin
          if LNewID <> '' then
            LCacheIDs.AddOrSetValue(LConta, LNewID);
          Inc(Result);
        end
        else
        begin
          // Log de erro específico
          // Se tiver Logger disponível, usar. Senão, assumir falha silenciosa mas perceptível na contagem.
        end;
      finally
        LObj.Free;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
    LCacheIDs.Free;
  end;
end;

function TSyncService.SyncCustomerClassifications(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCodeField: TField;
  LNameField: TField;
  LDescField: TField;
  LCode: string;
  LName: string;
  LDesc: string;

  function FindFieldByNames(AQuery: TFDQuery; const ANames: array of string): TField;
  var
    I: Integer;
    F: TField;
  begin
    Result := nil;
    for I := Low(ANames) to High(ANames) do
    begin
      F := AQuery.FindField(ANames[I]);
      if Assigned(F) then
      begin
        Result := F;
        Exit;
      end;
    end;
  end;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    try
      Q.SQL.Text := 'SELECT * FROM CLASSIFICACAO_CLIENTE';
      Q.Open;
    except
      on E: Exception do
      begin
        Log('Classificações de clientes não disponíveis: ' + E.Message);
        Exit;
      end;
    end;

    LCodeField := FindFieldByNames(Q, ['COD_CLASSIFICACAO', 'COD_CLASS', 'COD_CLA', 'COD_CLASSIF']);
    LNameField := FindFieldByNames(Q, ['DESCRICAO', 'NOME', 'NOME_CLASSIFICACAO', 'CLASSIFICACAO']);
    LDescField := FindFieldByNames(Q, ['OBSERVACAO', 'OBS', 'NOTAS', 'NOTES']);

    if (not Assigned(LCodeField)) and (not Assigned(LNameField)) then
    begin
      Log('Classificações de clientes: campos não encontrados.');
      Exit;
    end;

    while not Q.Eof do
    begin
      LCode := '';
      LName := '';
      LDesc := '';
      if Assigned(LCodeField) then
        LCode := Trim(LCodeField.AsString);
      if Assigned(LNameField) then
        LName := Trim(LNameField.AsString);
      if (LName = '') and (LCode <> '') then
        LName := LCode;
      if Assigned(LDescField) then
        LDesc := Trim(LDescField.AsString);

      if (LName <> '') or (LCode <> '') then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('externalId', LCode);
          if LName <> '' then
            LObj.AddPair('name', LName);
          if LDesc <> '' then
            LObj.AddPair('description', LDesc);
          if FAPI.SyncCustomerClassification(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar classificação ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncCustomers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LDoc: string;
  LTotal: Integer;
  LCurrent: Integer;
  LClassCache: TDictionary<string, Boolean>;
  LClassCodeField: TField;
  LClassNameField: TField;
  LClassCode: string;
  LClassName: string;
  LClassObj: TJSONObject;
  LRouteName: string;
  LRouteField: TField;
  LRouteCodeField: TField;
  LNeighborhood: string;

  function FindFieldByNames(AQuery: TFDQuery; const ANames: array of string): TField;
  var
    I: Integer;
    F: TField;
  begin
    Result := nil;
    for I := Low(ANames) to High(ANames) do
    begin
      F := AQuery.FindField(ANames[I]);
      if Assigned(F) then
      begin
        Result := F;
        Exit;
      end;
    end;
  end;
  
  function NormalizeDoc(const S: string): string;
  var
    C: Char;
  begin
    Result := '';
    for C in S do
      if CharInSet(C, ['0'..'9']) then
        Result := Result + C;
  end;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  LClassCache := TDictionary<string, Boolean>.Create;
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM CLIENTE';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT C.*, RO.NOME_ROTA AS NOME_ROTA FROM CLIENTE C LEFT JOIN ROTAS RO ON RO.COD_ROTA = C.ROTA_CLI';
    Q.Open;

    LClassCodeField := FindFieldByNames(Q, ['COD_CLASSIFICACAO', 'COD_CLASS', 'COD_CLA', 'COD_CLASSIF']);
    LClassNameField := FindFieldByNames(Q, ['CLASSIFICACAO', 'NOME_CLASSIFICACAO', 'DESCRICAO_CLASSIFICACAO', 'DESCRICAO']);
    LRouteField := FindFieldByNames(Q, ['NOME_ROTA', 'ROTA', 'ROTA_CLI']);
    LRouteCodeField := FindFieldByNames(Q, ['ROTA_CLI', 'COD_ROTA', 'CODIGO_ROTA']);
    
    Log(Format('Clientes encontrados (global): %d', [LTotal]));
    
    LCurrent := 0;
    
    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando clientes...', LCurrent, LTotal);
      
      LObj := TJSONObject.Create;
      try
        LObj.AddPair('externalId', Q.FieldByName('COD_CLI').AsString);
        LObj.AddPair('name', Q.FieldByName('NOME_CLI').AsString);
        LObj.AddPair('knownName', Q.FieldByName('NOME_FANTASIA').AsString);
        
        // Documento (CNPJ/CPF)
        LDoc := Trim(Q.FieldByName('CNPJ_CLI').AsString);
        if LDoc = '' then
          LDoc := Trim(Q.FieldByName('DOC_CLI').AsString);
        LDoc := NormalizeDoc(LDoc);
        if LDoc <> '' then
          LObj.AddPair('document', LDoc)
        else
          LObj.AddPair('document', TJSONNull.Create);
        
        // Contatos
        LObj.AddPair('email', Q.FieldByName('EMAIL_CLI').AsString);
        LObj.AddPair('phone', Q.FieldByName('TELRES_CLI').AsString);
        LObj.AddPair('phone2', Q.FieldByName('CELULAR_CLI').AsString);
        
        // Endereço (Prioridade: Residencial)
        LObj.AddPair('city', Q.FieldByName('CIDRES_CLI').AsString);
        LObj.AddPair('stateCode', Q.FieldByName('ESTRES_CLI').AsString);
        LNeighborhood := Trim(Q.FieldByName('BAIRES_CLI').AsString);
        LObj.AddPair('neighborhood', LNeighborhood);

        LRouteName := '';
        if Assigned(LRouteField) then
          LRouteName := Trim(LRouteField.AsString);
        if (LRouteName = '') and Assigned(LRouteCodeField) then
          LRouteName := Trim(LRouteCodeField.AsString);
        if LRouteName <> '' then
          LObj.AddPair('route', LRouteName);

        LClassCode := '';
        LClassName := '';
        if Assigned(LClassCodeField) then
          LClassCode := Trim(LClassCodeField.AsString);
        if Assigned(LClassNameField) then
          LClassName := Trim(LClassNameField.AsString);
        if (LClassCode <> '') then
        begin
          if not LClassCache.ContainsKey(LClassCode) then
          begin
            if LClassName = '' then
              LClassName := LClassCode;
            if LClassName <> '' then
            begin
              LClassObj := TJSONObject.Create;
              try
                LClassObj.AddPair('externalId', LClassCode);
                LClassObj.AddPair('name', LClassName);
                if FAPI.SyncCustomerClassification(LClassObj) then
                  LClassCache.AddOrSetValue(LClassCode, True)
                else
                  Log('Erro ao sincronizar classificação ' + LClassCode + ': ' + FAPI.LastErrorMessage);
              finally
                LClassObj.Free;
              end;
            end;
          end;
          LObj.AddPair('classificationExternalId', LClassCode);
        end;
        
        // Datas
        if not Q.FieldByName('NASCIMENTO_CLI').IsNull then
          LObj.AddPair('birthDate', FormatDateTime('yyyy-mm-dd', Q.FieldByName('NASCIMENTO_CLI').AsDateTime));
          
        // Status (ATIVO_CLI: 'S' ou 'N')
        if UpperCase(Q.FieldByName('ATIVO_CLI').AsString) = 'S' then
           LObj.AddPair('isActive', TJSONBool.Create(True))
        else
           LObj.AddPair('isActive', TJSONBool.Create(False));
           
        if FAPI.SyncCustomer(LObj) then
           Inc(Result)
         else
           Log('Erro ao sincronizar cliente ' + Q.FieldByName('COD_CLI').AsString + ': ' + FAPI.LastErrorMessage);
      finally
        LObj.Free;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
    LClassCache.Free;
  end;
end;

function TSyncService.SyncSuppliers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LDoc: string;

  function NormalizeDoc(const S: string): string;
  var
    C: Char;
  begin
    Result := '';
    for C in S do
      if CharInSet(C, ['0'..'9']) then
        Result := Result + C;
  end;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM FORNECEDOR';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT * FROM FORNECEDOR';
    Q.Open;

    Log(Format('Fornecedores encontrados (global): %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando fornecedores...', LCurrent, LTotal);

      LObj := TJSONObject.Create;
      try
        LObj.AddPair('externalId', Q.FieldByName('COD_FOR').AsString);
        LObj.AddPair('name', Q.FieldByName('RAZAO_FOR').AsString);

        LDoc := Trim(Q.FieldByName('CNPJ_FOR').AsString);
        LDoc := NormalizeDoc(LDoc);
        if LDoc <> '' then
          LObj.AddPair('document', LDoc)
        else
          LObj.AddPair('document', TJSONNull.Create);

        LObj.AddPair('email', Q.FieldByName('EMAIL_FOR').AsString);
        LObj.AddPair('phone', Q.FieldByName('TEL_FOR').AsString);
        LObj.AddPair('phone2', Q.FieldByName('FAX_FOR').AsString);
        LObj.AddPair('city', Q.FieldByName('CID_FOR').AsString);
        LObj.AddPair('stateCode', Q.FieldByName('EST_FOR').AsString);
        LObj.AddPair('neighborhood', Q.FieldByName('BAI_FOR').AsString);

        if UpperCase(Q.FieldByName('ATIVO_FOR').AsString) = 'S' then
          LObj.AddPair('isActive', TJSONBool.Create(True))
        else
          LObj.AddPair('isActive', TJSONBool.Create(False));

        if FAPI.SyncSupplier(LObj) then
          Inc(Result)
        else
          Log('Erro ao sincronizar fornecedor ' + Q.FieldByName('COD_FOR').AsString + ': ' + FAPI.LastErrorMessage);
      finally
        LObj.Free;
      end;

      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
  end;
end;

function TSyncService.SyncCustomerDeactivationReasons(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LDescricao: string;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM MOTIVO_CLIENTE_DESATIVADO';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT COD_MOTIVO, DESCRICAO FROM MOTIVO_CLIENTE_DESATIVADO';
    Q.Open;

    Log(Format('Motivos de desativação encontrados: %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando motivos de desativação...', LCurrent, LTotal);

      LDescricao := Trim(Q.FieldByName('DESCRICAO').AsString);
      if LDescricao <> '' then
      begin
        LObj := TJSONObject.Create;
        try
          LObj.AddPair('externalId', Q.FieldByName('COD_MOTIVO').AsString);
          LObj.AddPair('description', LDescricao);
          LObj.AddPair('active', TJSONBool.Create(True));

          if FAPI.SyncCustomerDeactivationReason(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar motivo ' + Q.FieldByName('COD_MOTIVO').AsString + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;

      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
  end;
end;

function TSyncService.SyncCustomerDeactivationHistory(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LCustomerId: string;
  LReasonId: string;
  LReasonText: string;
  LCustomerMap: TDictionary<string, string>;
  LReasonMap: TDictionary<string, string>;
  LTipo: string;
  LDescTipo: string;
  LData: TDateTime;
  LExternalId: string;

  function ShouldImport(const ATipo, ADesc: string): Boolean;
  var
    LT: string;
  begin
    LT := UpperCase(Trim(ATipo));
    if LT = 'D' then
      Exit(True);
    if LT = '' then
      Exit(Pos('DESATIV', UpperCase(ADesc)) > 0);
    Result := False;
  end;

  function PickReasonText(const A1, A2, A3, A4: string): string;
  begin
    Result := Trim(A1);
    if Result = '' then Result := Trim(A2);
    if Result = '' then Result := Trim(A3);
    if Result = '' then Result := Trim(A4);
  end;

  function LoadCustomerMap: TDictionary<string, string>;
  var
    LArr: TJSONArray;
    I: Integer;
    LItem: TJSONObject;
    LExtVal: TJSONValue;
    LIdVal: TJSONValue;
    LExt: string;
    LId: string;
    LTake: Integer;
    LSkip: Integer;
  begin
    Result := TDictionary<string, string>.Create;
    LTake := 200;
    LSkip := 0;
    while True do
    begin
      LArr := FAPI.ListCustomers(LTake, LSkip);
      if not Assigned(LArr) then
        Break;
      try
        if LArr.Count = 0 then
          Break;
        for I := 0 to LArr.Count - 1 do
        begin
          if not (LArr.Items[I] is TJSONObject) then
            Continue;
          LItem := TJSONObject(LArr.Items[I]);
          LExtVal := LItem.GetValue('externalId');
          LIdVal := LItem.GetValue('id');
          if Assigned(LExtVal) and Assigned(LIdVal) and (not (LExtVal is TJSONNull)) then
          begin
            LExt := LExtVal.Value;
            LId := LIdVal.Value;
            if (LExt <> '') and (LId <> '') then
              Result.AddOrSetValue(LExt, LId);
          end;
        end;
      finally
        LArr.Free;
      end;
      Inc(LSkip, LTake);
    end;
  end;

  function LoadReasonMap: TDictionary<string, string>;
  var
    LArr: TJSONArray;
    I: Integer;
    LItem: TJSONObject;
    LExtVal: TJSONValue;
    LIdVal: TJSONValue;
    LExt: string;
    LId: string;
  begin
    Result := TDictionary<string, string>.Create;
    LArr := FAPI.ListCustomerDeactivationReasons;
    if not Assigned(LArr) then
      Exit;
    try
      for I := 0 to LArr.Count - 1 do
      begin
        if not (LArr.Items[I] is TJSONObject) then
          Continue;
        LItem := TJSONObject(LArr.Items[I]);
        LExtVal := LItem.GetValue('externalId');
        LIdVal := LItem.GetValue('id');
        if Assigned(LExtVal) and Assigned(LIdVal) and (not (LExtVal is TJSONNull)) then
        begin
          LExt := LExtVal.Value;
          LId := LIdVal.Value;
          if (LExt <> '') and (LId <> '') then
            Result.AddOrSetValue(LExt, LId);
        end;
      end;
    finally
      LArr.Free;
    end;
  end;

begin
  Result := 0;
  EnsureCompanyContext(ACodEmp);
  LCustomerMap := LoadCustomerMap;
  LReasonMap := LoadReasonMap;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM HISTORICO_BLOQUEIO_CLIENTE';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT CODIGO, COD_CLI, DATA_HORA_BLOQUEIO_DESBLOQUEIO, MOTIVO, TIPO, DESCRICAO_TIPO, COD_MOTIVO_DESATIVACAO, MENSAGEM_CLIENTE, OBSERVACOES FROM HISTORICO_BLOQUEIO_CLIENTE';
    Q.Open;

    Log(Format('Histórico de desativação encontrado: %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando histórico de desativação...', LCurrent, LTotal);

      LTipo := Q.FieldByName('TIPO').AsString;
      LDescTipo := Q.FieldByName('DESCRICAO_TIPO').AsString;
      if not ShouldImport(LTipo, LDescTipo) then
      begin
        Q.Next;
        Continue;
      end;

      LExternalId := Q.FieldByName('COD_CLI').AsString;
      if (LExternalId = '') or (not LCustomerMap.TryGetValue(LExternalId, LCustomerId)) then
      begin
        Log('Cliente não encontrado para histórico ' + Q.FieldByName('CODIGO').AsString + ' (COD_CLI ' + LExternalId + ').');
        Q.Next;
        Continue;
      end;

      LReasonId := '';
      if not Q.FieldByName('COD_MOTIVO_DESATIVACAO').IsNull then
        LReasonMap.TryGetValue(Q.FieldByName('COD_MOTIVO_DESATIVACAO').AsString, LReasonId);

      LReasonText := PickReasonText(
        Q.FieldByName('MOTIVO').AsString,
        Q.FieldByName('DESCRICAO_TIPO').AsString,
        Q.FieldByName('MENSAGEM_CLIENTE').AsString,
        Q.FieldByName('OBSERVACOES').AsString
      );

      LObj := TJSONObject.Create;
      try
        if LReasonId <> '' then
          LObj.AddPair('reasonId', LReasonId);
        if LReasonText <> '' then
          LObj.AddPair('reason', LReasonText);
        if not Q.FieldByName('DATA_HORA_BLOQUEIO_DESBLOQUEIO').IsNull then
        begin
          LData := Q.FieldByName('DATA_HORA_BLOQUEIO_DESBLOQUEIO').AsDateTime;
          LObj.AddPair('deactivatedAt', FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', LData));
        end;

        if FAPI.CreateCustomerDeactivation(LCustomerId, LObj) then
          Inc(Result)
        else
          Log('Erro ao sincronizar histórico ' + Q.FieldByName('CODIGO').AsString + ': ' + FAPI.LastErrorMessage);
      finally
        LObj.Free;
      end;

      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
    LCustomerMap.Free;
    LReasonMap.Free;
  end;
end;

function TSyncService.SyncProductSections(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCode, LName: string;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT COD_SEC, NOME_SEC FROM SECAO';
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LName := Trim(Q.FieldByName('NOME_SEC').AsString);
      if (LCode <> '') or (LName <> '') then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('code', LCode);
          if LName <> '' then
            LObj.AddPair('name', LName)
          else
            LObj.AddPair('name', LCode);
          if FAPI.SyncProductSection(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar seção ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncProductGroups(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCode, LName, LSectionCode, LSectionName: string;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT sg.COD_GRUPO, sg.DESCRICAO, s.COD_SEC, s.NOME_SEC FROM SECAO_GRUPO sg ' +
      'JOIN SECAO s ON s.COD_SEC = sg.COD_SEC';
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_GRUPO').AsString);
      LName := Trim(Q.FieldByName('DESCRICAO').AsString);
      LSectionCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LSectionName := Trim(Q.FieldByName('NOME_SEC').AsString);
      if (LCode <> '') or (LName <> '') then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('code', LCode);
          if LName <> '' then
            LObj.AddPair('name', LName)
          else
            LObj.AddPair('name', LCode);
          if LSectionCode <> '' then
            LObj.AddPair('sectionCode', LSectionCode);
          if LSectionName <> '' then
            LObj.AddPair('sectionName', LSectionName);
          if FAPI.SyncProductGroup(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar grupo ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncProductSubgroups(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCode, LName, LGroupCode, LGroupName, LSectionCode, LSectionName: string;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT sgs.COD_SUBGRUPO, sgs.DESCRICAO, sg.COD_GRUPO, sg.DESCRICAO AS GRUPO, ' +
      's.COD_SEC, s.NOME_SEC FROM SECAO_GRUPO_SUBGRUPO sgs ' +
      'JOIN SECAO_GRUPO sg ON sg.COD_SEC = sgs.COD_SEC AND sg.COD_GRUPO = sgs.COD_GRUPO ' +
      'JOIN SECAO s ON s.COD_SEC = sgs.COD_SEC';
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_SUBGRUPO').AsString);
      LName := Trim(Q.FieldByName('DESCRICAO').AsString);
      LGroupCode := Trim(Q.FieldByName('COD_GRUPO').AsString);
      LGroupName := Trim(Q.FieldByName('GRUPO').AsString);
      LSectionCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LSectionName := Trim(Q.FieldByName('NOME_SEC').AsString);
      if (LCode <> '') or (LName <> '') then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('code', LCode);
          if LName <> '' then
            LObj.AddPair('name', LName)
          else
            LObj.AddPair('name', LCode);
          if LGroupCode <> '' then
            LObj.AddPair('groupCode', LGroupCode);
          if LGroupName <> '' then
            LObj.AddPair('groupName', LGroupName);
          if LSectionCode <> '' then
            LObj.AddPair('sectionCode', LSectionCode);
          if LSectionName <> '' then
            LObj.AddPair('sectionName', LSectionName);
          if FAPI.SyncProductSubgroup(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar subgrupo ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncProductManufacturers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCode, LName: string;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT COD_LAB, NOME_LAB FROM LABORATORIO';
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_LAB').AsString);
      LName := Trim(Q.FieldByName('NOME_LAB').AsString);
      if (LCode <> '') or (LName <> '') then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('code', LCode);
          if LName <> '' then
            LObj.AddPair('name', LName)
          else
            LObj.AddPair('name', LCode);
          if FAPI.SyncProductManufacturer(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar fabricante ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncProducts(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LExternalId, LCode, LSku, LBarcode, LName, LSection, LGroup, LSubgroup, LActiveStr: string;
begin
  Result := 0;
  Inc(Result, SyncProductSections(ACodEmp));
  Inc(Result, SyncProductGroups(ACodEmp));
  Inc(Result, SyncProductSubgroups(ACodEmp));
  Inc(Result, SyncProductManufacturers(ACodEmp));
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT COD_PRO, REFERENCIA_PRO, CODIGO_BARRA_PRO, COD_BARRA_PRO_TRIB, NOME_PRO, COD_SEC, COD_GRUPO, SUB_GRUPO, PRECO_CUSTO, VALOR_PRO, ATIVO_PRO FROM PRODUTO WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    while not Q.Eof do
    begin
      LExternalId := Trim(Q.FieldByName('COD_PRO').AsString);
      LSku := Trim(Q.FieldByName('REFERENCIA_PRO').AsString);
      LBarcode := Trim(Q.FieldByName('CODIGO_BARRA_PRO').AsString);
      if LBarcode = '' then
        LBarcode := Trim(Q.FieldByName('COD_BARRA_PRO_TRIB').AsString);
      LName := Trim(Q.FieldByName('NOME_PRO').AsString);
      LSection := Trim(Q.FieldByName('COD_SEC').AsString);
      LGroup := Trim(Q.FieldByName('COD_GRUPO').AsString);
      LSubgroup := Trim(Q.FieldByName('SUB_GRUPO').AsString);
      LActiveStr := UpperCase(Trim(Q.FieldByName('ATIVO_PRO').AsString));

      if LName <> '' then
      begin
        LObj := TJSONObject.Create;
        try
          if LExternalId <> '' then
            LObj.AddPair('externalId', LExternalId);
          if LSku <> '' then
          begin
            LObj.AddPair('sku', LSku);
            LCode := LSku;
          end
          else
            LCode := LExternalId;
          if LCode <> '' then
            LObj.AddPair('code', LCode);
          if LBarcode <> '' then
            LObj.AddPair('barcode', LBarcode);
          LObj.AddPair('name', LName);
          if LSection <> '' then
            LObj.AddPair('section', LSection);
          if LGroup <> '' then
            LObj.AddPair('group', LGroup);
          if LSubgroup <> '' then
            LObj.AddPair('subgroup', LSubgroup);
          if not Q.FieldByName('PRECO_CUSTO').IsNull then
            LObj.AddPair('costPrice', TJSONNumber.Create(Q.FieldByName('PRECO_CUSTO').AsFloat));
          if not Q.FieldByName('VALOR_PRO').IsNull then
            LObj.AddPair('salePrice', TJSONNumber.Create(Q.FieldByName('VALOR_PRO').AsFloat));
          LObj.AddPair('active', TJSONBool.Create((LActiveStr = 'S') or (LActiveStr = 'A') or (LActiveStr = '1')));

          if FAPI.SyncProduct(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar produto ' + LExternalId + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
  end;
end;

function TSyncService.SyncPaymentMethods(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LCode: string;
  LName: string;
  LEnabledStr: string;
  LEnabled: Boolean;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM FORMAS_PAGAMENTO';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT CODIGO, DESCRICAO, USAR_VENDAS_RETAGUARDA, USAR_VENDAS_RETAGUARDA_PV FROM FORMAS_PAGAMENTO';
    Q.Open;
    Log(Format('Formas de pagamento encontradas: %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando formas de pagamento...', LCurrent, LTotal);

      LCode := Trim(Q.FieldByName('CODIGO').AsString);
      LName := Trim(Q.FieldByName('DESCRICAO').AsString);
      LEnabledStr := UpperCase(Trim(Q.FieldByName('USAR_VENDAS_RETAGUARDA').AsString));
      if (LEnabledStr = '') and (Q.FindField('USAR_VENDAS_RETAGUARDA_PV') <> nil) then
        LEnabledStr := UpperCase(Trim(Q.FieldByName('USAR_VENDAS_RETAGUARDA_PV').AsString));
      LEnabled := (LEnabledStr = 'S') or (LEnabledStr = '1') or (LEnabledStr = 'T') or (LEnabledStr = 'Y');
      if LEnabledStr = '' then
        LEnabled := True;

      if LName <> '' then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('externalId', LCode);
          LObj.AddPair('name', LName);
          LObj.AddPair('enabled', TJSONBool.Create(LEnabled));
          if FAPI.SyncPaymentMethod(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar forma de pagamento ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
  end;
end;

function TSyncService.SyncSellers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LCode: string;
  LName: string;
  LActive: Boolean;
  LCodeField: TField;
  LNameField: TField;
  LActiveField: TField;

  function FindFieldByNames(AQuery: TFDQuery; const ANames: array of string): TField;
  var
    I: Integer;
    F: TField;
  begin
    Result := nil;
    for I := Low(ANames) to High(ANames) do
    begin
      F := AQuery.FindField(ANames[I]);
      if Assigned(F) then
      begin
        Result := F;
        Exit;
      end;
    end;
  end;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    try
      QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM USUARIO';
      QCount.Open;
      LTotal := QCount.FieldByName('CNT').AsInteger;
    except
      on E: Exception do
      begin
        Log('Tabela USUARIO não encontrada: ' + E.Message);
        Exit;
      end;
    end;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT * FROM USUARIO';
    Q.Open;
    LCodeField := FindFieldByNames(Q, ['COD_USU', 'COD_VEND', 'COD_VEN', 'CODIGO', 'ID_VEND', 'ID']);
    LNameField := FindFieldByNames(Q, ['NOME_USU', 'NOME_VEND', 'NOME', 'DESCRICAO', 'APELIDO', 'VENDEDOR']);
    LActiveField := FindFieldByNames(Q, ['ATIVO', 'ATIVO_VEND', 'STATUS', 'SITUACAO']);

    Log(Format('Vendedores encontrados: %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando vendedores...', LCurrent, LTotal);

      LCode := '';
      LName := '';
      if Assigned(LCodeField) then
        LCode := Trim(LCodeField.AsString);
      if Assigned(LNameField) then
        LName := Trim(LNameField.AsString);
      if LName = '' then
        LName := LCode;

      LActive := True;
      if Assigned(LActiveField) then
        LActive := (UpperCase(Trim(LActiveField.AsString)) = 'S') or (UpperCase(Trim(LActiveField.AsString)) = '1') or (UpperCase(Trim(LActiveField.AsString)) = 'A');

      if LName <> '' then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('externalId', LCode);
          LObj.AddPair('name', LName);
          LObj.AddPair('active', TJSONBool.Create(LActive));
          if FAPI.SyncSeller(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar vendedor ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
  end;
end;

function TSyncService.SyncCashiers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LCode: string;
  LName: string;
  LActive: Boolean;
  LCodeField: TField;
  LNameField: TField;
  LActiveField: TField;

  function FindFieldByNames(AQuery: TFDQuery; const ANames: array of string): TField;
  var
    I: Integer;
    F: TField;
  begin
    Result := nil;
    for I := Low(ANames) to High(ANames) do
    begin
      F := AQuery.FindField(ANames[I]);
      if Assigned(F) then
      begin
        Result := F;
        Exit;
      end;
    end;
  end;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    try
      QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM CAIXA';
      QCount.Open;
      LTotal := QCount.FieldByName('CNT').AsInteger;
    except
      on E: Exception do
      begin
        Log('Tabela CAIXA não encontrada: ' + E.Message);
        Exit;
      end;
    end;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT * FROM CAIXA';
    Q.Open;
    LCodeField := FindFieldByNames(Q, ['COD_CAI', 'COD_CAIXA', 'CODIGO', 'ID_CAIXA', 'ID']);
    LNameField := FindFieldByNames(Q, ['DESC_CAI', 'NOME', 'DESCRICAO', 'CAIXA']);
    LActiveField := FindFieldByNames(Q, ['ATIVO', 'STATUS', 'SITUACAO']);

    Log(Format('Caixas encontrados: %d', [LTotal]));
    LCurrent := 0;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando caixas...', LCurrent, LTotal);

      LCode := '';
      LName := '';
      if Assigned(LCodeField) then
        LCode := Trim(LCodeField.AsString);
      if Assigned(LNameField) then
        LName := Trim(LNameField.AsString);
      if LName = '' then
        LName := LCode;

      LActive := True;
      if Assigned(LActiveField) then
        LActive := (UpperCase(Trim(LActiveField.AsString)) = 'S') or (UpperCase(Trim(LActiveField.AsString)) = '1') or (UpperCase(Trim(LActiveField.AsString)) = 'A');

      if LName <> '' then
      begin
        LObj := TJSONObject.Create;
        try
          if LCode <> '' then
            LObj.AddPair('externalId', LCode);
          LObj.AddPair('name', LName);
          LObj.AddPair('active', TJSONBool.Create(LActive));
          if FAPI.SyncCashier(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar caixa ' + LCode + ': ' + FAPI.LastErrorMessage);
        finally
          LObj.Free;
        end;
      end;
      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
  end;
end;

function TSyncService.SyncSales(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  QItems: TFDQuery;
  QPayments: TFDQuery;
  LObj: TJSONObject;
  LItems: TJSONArray;
  LItem: TJSONObject;
  LPayments: TJSONArray;
  LPayment: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LExternalId: string;
  LDate: TDateTime;
  LStatus: string;
begin
  Result := 0;
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  QItems := TFDQuery.Create(nil);
  QPayments := TFDQuery.Create(nil);
  try
    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM VENDAS WHERE COD_EMP = :CodEmp AND DATA_VEN BETWEEN :DataIni AND :DataFim';
    QCount.ParamByName('CodEmp').AsInteger := ACodEmp;
    QCount.ParamByName('DataIni').AsDate := ADateFrom;
    QCount.ParamByName('DataFim').AsDate := ADateTo;
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    Q.SQL.Text := 'SELECT * FROM VENDAS WHERE COD_EMP = :CodEmp AND DATA_VEN BETWEEN :DataIni AND :DataFim';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.ParamByName('DataIni').AsDate := ADateFrom;
    Q.ParamByName('DataFim').AsDate := ADateTo;
    Q.Open;

    Log(Format('Vendas encontradas (%s a %s): %d', [DateToStr(ADateFrom), DateToStr(ADateTo), LTotal]));
    LCurrent := 0;

    QItems.Connection := FDB;
    QPayments.Connection := FDB;

    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Sincronizando vendas...', LCurrent, LTotal);

      LExternalId := Trim(Q.FieldByName('COD_VEN').AsString);
      if LExternalId = '' then
      begin
        Q.Next;
        Continue;
      end;

      LObj := TJSONObject.Create;
      try
        LObj.AddPair('externalId', LExternalId);
        if Q.FindField('COD_CLI') <> nil then
          LObj.AddPair('customerExternalId', Q.FieldByName('COD_CLI').AsString);
        if Q.FindField('COD_USU_VEND') <> nil then
          LObj.AddPair('sellerExternalId', Q.FieldByName('COD_USU_VEND').AsString);
        if Q.FindField('COD_CAI') <> nil then
          LObj.AddPair('cashierExternalId', Q.FieldByName('COD_CAI').AsString);

        if (Q.FindField('DATA_HORA_VEN') <> nil) and (not Q.FieldByName('DATA_HORA_VEN').IsNull) then
          LDate := Q.FieldByName('DATA_HORA_VEN').AsDateTime
        else
          LDate := Q.FieldByName('DATA_VEN').AsDateTime;
        LObj.AddPair('date', FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', LDate));

        if Q.FindField('CANCELADA_VEN') <> nil then
        begin
          if Q.FieldByName('CANCELADA_VEN').AsInteger = 1 then
            LStatus := 'CANCELADA'
          else
            LStatus := 'OK';
          LObj.AddPair('status', LStatus);
        end;

        LItems := TJSONArray.Create;
        QItems.SQL.Text := 'SELECT * FROM ITENS_VENDA WHERE COD_EMP = :CodEmp AND COD_VEN = :CodVen';
        QItems.ParamByName('CodEmp').AsInteger := ACodEmp;
        QItems.ParamByName('CodVen').AsInteger := Q.FieldByName('COD_VEN').AsInteger;
        QItems.Open;
        while not QItems.Eof do
        begin
          LItem := TJSONObject.Create;
          LItem.AddPair('id', QItems.FieldByName('ORDEM').AsString);
          LItem.AddPair('productExternalId', QItems.FieldByName('COD_PRO').AsString);
          LItem.AddPair('description', QItems.FieldByName('NOME_PRODUTO').AsString);
          LItem.AddPair('quantity', TJSONNumber.Create(QItems.FieldByName('QUANT').AsFloat));
          LItem.AddPair('unitPrice', TJSONNumber.Create(QItems.FieldByName('VALOR').AsFloat));
          LItems.AddElement(LItem);
          QItems.Next;
        end;
        QItems.Close;
        LObj.AddPair('items', LItems);

        LPayments := TJSONArray.Create;
        QPayments.SQL.Text := 'SELECT * FROM VENDAS_FORMAS_PAGAMENTO WHERE COD_VENDA = :CodVen';
        QPayments.ParamByName('CodVen').AsInteger := Q.FieldByName('COD_VEN').AsInteger;
        QPayments.Open;
        while not QPayments.Eof do
        begin
          LPayment := TJSONObject.Create;
          LPayment.AddPair('paymentMethodExternalId', QPayments.FieldByName('COD_FORMA').AsString);
          LPayment.AddPair('amount', TJSONNumber.Create(QPayments.FieldByName('VALOR').AsFloat));
          LPayments.AddElement(LPayment);
          QPayments.Next;
        end;
        QPayments.Close;
        LObj.AddPair('payments', LPayments);

        if FAPI.SyncSale(LObj) then
          Inc(Result)
        else
          Log('Erro ao sincronizar venda ' + LExternalId + ': ' + FAPI.LastErrorMessage);
      finally
        LObj.Free;
      end;

      Q.Next;
    end;
  finally
    Q.Free;
    QCount.Free;
    QItems.Free;
    QPayments.Free;
  end;
end;

function TSyncService.SyncApTitles(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime; ADateKind: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LExternalId: string;
  LIssueDate: TDateTime;
  LDueDate: TDateTime;
  LPaymentDate: Variant;
  LAmount: Double;
  LPaidAmount: Double;
  LDiscountReceived: Double;
  LInterestReceived: Double;
  LOpenAmount: Double;
  LStatus: string;
  LDoc: string;
  LSeq: string;
  LDateField: string;
  LBuffer: TObjectList<TJSONObject>;

  function FieldFloat(const AFieldName: string): Double;
  begin
    if (Q.FindField(AFieldName) <> nil) and (not Q.FieldByName(AFieldName).IsNull) then
      Result := Q.FieldByName(AFieldName).AsFloat
    else
      Result := 0;
  end;

  function FieldStr(const AFieldName: string): string;
  begin
    if (Q.FindField(AFieldName) <> nil) and (not Q.FieldByName(AFieldName).IsNull) then
      Result := Trim(Q.FieldByName(AFieldName).AsString)
    else
      Result := '';
  end;
begin
  Result := 0;
  LBuffer := TObjectList<TJSONObject>.Create(True);
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    case ADateKind of
      1: LDateField := 'DTVENCTO_CTP';
      2: LDateField := 'DTPAGTO_CTP';
    else
      LDateField := 'DATA_CTP';
    end;

    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM CONTAS_PAGAR WHERE COD_EMP = :CodEmp AND ' + LDateField + ' BETWEEN :DataIni AND :DataFim';
    QCount.ParamByName('CodEmp').AsInteger := ACodEmp;
    QCount.ParamByName('DataIni').AsDate := ADateFrom;
    QCount.ParamByName('DataFim').AsDate := ADateTo;
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    // FASE 1: Lê todos os registros do Firebird para memória
    Q.Connection := FDB;
    Q.FetchOptions.Mode := fmAll;
    Q.FetchOptions.Unidirectional := False;
    Q.SQL.Text := 'SELECT * FROM CONTAS_PAGAR WHERE COD_EMP = :CodEmp AND ' + LDateField + ' BETWEEN :DataIni AND :DataFim';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.ParamByName('DataIni').AsDate := ADateFrom;
    Q.ParamByName('DataFim').AsDate := ADateTo;
    Q.Open;

    Log(Format('Contas a Pagar encontradas (%s a %s): %d', [DateToStr(ADateFrom), DateToStr(ADateTo), LTotal]));
    Log('Carregando registros para memória...');

    while not Q.Eof do
    begin
      LExternalId := FieldStr('COD_CPT');
      LSeq := FieldStr('SEQUENCIA_CTP');
      if LSeq <> '' then
        LExternalId := LExternalId + '-' + LSeq;
      if LExternalId = '' then
      begin
        Q.Next;
        Continue;
      end;

      LIssueDate := Q.FieldByName('DATA_CTP').AsDateTime;
      LDueDate := Q.FieldByName('DTVENCTO_CTP').AsDateTime;

      LPaymentDate := Null;
      if (Q.FindField('DTPAGTO_CTP') <> nil) and (not Q.FieldByName('DTPAGTO_CTP').IsNull) then
        LPaymentDate := Q.FieldByName('DTPAGTO_CTP').AsDateTime;

      LAmount := FieldFloat('VALOR_CTP');
      LPaidAmount := FieldFloat('VALOR_PAGO_CTP');
      LDiscountReceived := FieldFloat('DESCONTO_CTP');
      LInterestReceived := FieldFloat('ACRESCIMO_CTP');
      LOpenAmount := LAmount - LPaidAmount - LDiscountReceived + LInterestReceived;
      if LOpenAmount < 0 then
        LOpenAmount := 0;

      if not VarIsNull(LPaymentDate) then
        LStatus := 'PAID'
      else if (LAmount > 0) and (LOpenAmount < 0.01) then
        LStatus := 'PAID'
      else if (LDueDate < Date) and (LOpenAmount > 0) then
        LStatus := 'OVERDUE'
      else
        LStatus := 'OPEN';

      LDoc := FieldStr('NUM_DOC_CTP');
      if LDoc = '' then
        LDoc := FieldStr('CHEQUE');

      LObj := TJSONObject.Create;
      LObj.AddPair('externalId', LExternalId);
      LObj.AddPair('supplierExternalId', FieldStr('COD_FOR'));
      LObj.AddPair('issueDate', FormatDateTime('yyyy-mm-dd', LIssueDate));
      LObj.AddPair('dueDate', FormatDateTime('yyyy-mm-dd', LDueDate));
      if VarIsNull(LPaymentDate) then
        LObj.AddPair('paymentDate', TJSONNull.Create)
      else
        LObj.AddPair('paymentDate', FormatDateTime('yyyy-mm-dd', LPaymentDate));
      LObj.AddPair('amount', TJSONNumber.Create(LAmount));
      LObj.AddPair('openAmount', TJSONNumber.Create(LOpenAmount));
      LObj.AddPair('paidAmount', TJSONNumber.Create(LPaidAmount));
      LObj.AddPair('discountReceived', TJSONNumber.Create(LDiscountReceived));
      LObj.AddPair('interestReceived', TJSONNumber.Create(LInterestReceived));
      LObj.AddPair('status', LStatus);
      if LDoc <> '' then
        LObj.AddPair('documentNumber', LDoc)
      else
        LObj.AddPair('documentNumber', TJSONNull.Create);
      LObj.AddPair('notes', FieldStr('OBS_CTP'));

      LBuffer.Add(LObj);
      Q.Next;
    end;

    // Fecha Firebird ANTES dos POSTs HTTP
    Q.Close;
    QCount.Close;
    FDB.Connected := False;
    Log(Format('Registros carregados: %d. Iniciando envio para API...', [LBuffer.Count]));

    // FASE 2: Envia para a API
    LTotal := LBuffer.Count;
    LCurrent := 0;
    for LObj in LBuffer do
    begin
      Inc(LCurrent);
      Progress('Sincronizando contas a pagar...', LCurrent, LTotal);
      if FAPI.SyncApTitle(LObj) then
        Inc(Result)
      else
        Log('Erro ao sincronizar conta a pagar: ' + FAPI.LastErrorMessage);
    end;

    FDB.Connected := True;

  finally
    Q.Free;
    QCount.Free;
    LBuffer.Free;
  end;
end;

function TSyncService.SyncArTitles(ACodEmp: Integer; ADateFrom, ADateTo: TDateTime; ADateKind: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LTotal: Integer;
  LCurrent: Integer;
  LExternalId: string;
  LIssueDate: TDateTime;
  LDueDate: TDateTime;
  LPaymentDate: Variant;
  LAmount: Double;
  LPaidAmount: Double;
  LDiscountReceived: Double;
  LInterestReceived: Double;
  LRefundReceived: Double;
  LOpenAmount: Double;
  LStatus: string;
  LDoc: string;
  LSeq: string;
  LDateField: string;
  LSellerCode: string;
  LSellerName: string;
  // Lista em memória: separa fase de leitura do Firebird da fase de envio HTTP
  LBuffer: TObjectList<TJSONObject>;

  function FieldFloat(const AFieldName: string): Double;
  begin
    if (Q.FindField(AFieldName) <> nil) and (not Q.FieldByName(AFieldName).IsNull) then
      Result := Q.FieldByName(AFieldName).AsFloat
    else
      Result := 0;
  end;

  function FieldStr(const AFieldName: string): string;
  begin
    if (Q.FindField(AFieldName) <> nil) and (not Q.FieldByName(AFieldName).IsNull) then
      Result := Trim(Q.FieldByName(AFieldName).AsString)
    else
      Result := '';
  end;
begin
  Result := 0;
  LBuffer := TObjectList<TJSONObject>.Create(True); // True = owns objects
  QCount := TFDQuery.Create(nil);
  Q := TFDQuery.Create(nil);
  try
    case ADateKind of
      1: LDateField := 'VENCTO_CTR';
      2: LDateField := 'COALESCE(DTPAGTO_REAL_CTR, DTPAGTO_CTR)';
    else
      LDateField := 'DATA_CTR';
    end;

    QCount.Connection := FDB;
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM CONTAS_RECEBER WHERE COD_EMP = :CodEmp AND ' + LDateField + ' BETWEEN :DataIni AND :DataFim';
    QCount.ParamByName('CodEmp').AsInteger := ACodEmp;
    QCount.ParamByName('DataIni').AsDate := ADateFrom;
    QCount.ParamByName('DataFim').AsDate := ADateTo;
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    // FASE 1: Lê todos os registros do Firebird para memória (LBuffer)
    // A conexão com Firebird fica ativa apenas durante esta fase rápida
    Q.Connection := FDB;
    Q.FetchOptions.Mode := fmAll;
    Q.FetchOptions.Unidirectional := False;
    Q.SQL.Text := 'SELECT R.*, V.COD_USU_VEND, VE.NOME_USU FROM CONTAS_RECEBER R ' +
                  'LEFT JOIN VENDAS V ON (R.COD_VENDA = V.COD_VEN) ' +
                  'LEFT JOIN USUARIO VE ON (V.COD_USU_VEND = VE.COD_USU) ' +
                  'WHERE R.COD_EMP = :CodEmp AND ' + LDateField + ' BETWEEN :DataIni AND :DataFim';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.ParamByName('DataIni').AsDate := ADateFrom;
    Q.ParamByName('DataFim').AsDate := ADateTo;
    Q.Open;

    Log(Format('Contas a Receber encontradas (%s a %s): %d', [DateToStr(ADateFrom), DateToStr(ADateTo), LTotal]));
    Log('Carregando registros para memória...');

    while not Q.Eof do
    begin
      LExternalId := FieldStr('COD_CTR');
      LSeq := FieldStr('SEQUENCIA_CTR');
      if LSeq <> '' then
        LExternalId := LExternalId + '-' + LSeq;
      if LExternalId = '' then
      begin
        Q.Next;
        Continue;
      end;

      LIssueDate := Q.FieldByName('DATA_CTR').AsDateTime;
      LDueDate := Q.FieldByName('VENCTO_CTR').AsDateTime;

      LPaymentDate := Null;
      if (Q.FindField('DTPAGTO_REAL_CTR') <> nil) and (not Q.FieldByName('DTPAGTO_REAL_CTR').IsNull) then
        LPaymentDate := Q.FieldByName('DTPAGTO_REAL_CTR').AsDateTime
      else if (Q.FindField('DTPAGTO_CTR') <> nil) and (not Q.FieldByName('DTPAGTO_CTR').IsNull) then
        LPaymentDate := Q.FieldByName('DTPAGTO_CTR').AsDateTime;

      LAmount := FieldFloat('VALOR_CTR');
      LPaidAmount := FieldFloat('VLRPAGO_CTR');
      LDiscountReceived := FieldFloat('DESCONTO_CONCEDIDO_CTR');
      LInterestReceived := FieldFloat('ACRESCIMO_RECEBIDO_CTR');
      LRefundReceived := FieldFloat('DEVOLUCAO_CTR');
      LOpenAmount := LAmount - LPaidAmount - LDiscountReceived - LRefundReceived + LInterestReceived;
      if LOpenAmount < 0 then
        LOpenAmount := 0;

      // Se DTPAGTO_CTR preenchido → pago (regra principal do Delphi)
      if not VarIsNull(LPaymentDate) then
        LStatus := 'PAID'
      else if (LAmount > 0) and (LOpenAmount < 0.01) then
        LStatus := 'PAID'
      else if (LDueDate < Date) and (LOpenAmount > 0) then
        LStatus := 'OVERDUE'
      else
        LStatus := 'OPEN';

      LDoc := FieldStr('NUMDOCUMENTO_CTR');
      if LDoc = '' then
        LDoc := FieldStr('NUM_TITULO');

      LSellerCode := FieldStr('COD_USU_VEND');
      LSellerName := FieldStr('NOME_USU');

      LObj := TJSONObject.Create;
      LObj.AddPair('externalId', LExternalId);
      LObj.AddPair('externalSeq', LSeq);
      LObj.AddPair('customerExternalId', FieldStr('COD_CLI'));
      if not Q.FieldByName('COD_VENDA').IsNull then
        LObj.AddPair('saleExternalId', FieldStr('COD_VENDA'))
      else
        LObj.AddPair('saleExternalId', TJSONNull.Create);
      if LSellerCode <> '' then
        LObj.AddPair('sellerExternalId', LSellerCode)
      else
        LObj.AddPair('sellerExternalId', TJSONNull.Create);
      if LSellerName <> '' then
        LObj.AddPair('sellerName', LSellerName)
      else
        LObj.AddPair('sellerName', TJSONNull.Create);
      LObj.AddPair('issueDate', FormatDateTime('yyyy-mm-dd', LIssueDate));
      LObj.AddPair('dueDate', FormatDateTime('yyyy-mm-dd', LDueDate));
      if VarIsNull(LPaymentDate) then
        LObj.AddPair('paymentDate', TJSONNull.Create)
      else
        LObj.AddPair('paymentDate', FormatDateTime('yyyy-mm-dd', LPaymentDate));
      LObj.AddPair('amount', TJSONNumber.Create(LAmount));
      LObj.AddPair('openAmount', TJSONNumber.Create(LOpenAmount));
      LObj.AddPair('paidAmount', TJSONNumber.Create(LPaidAmount));
      LObj.AddPair('discountReceived', TJSONNumber.Create(LDiscountReceived));
      LObj.AddPair('interestReceived', TJSONNumber.Create(LInterestReceived));
      LObj.AddPair('refundReceived', TJSONNumber.Create(LRefundReceived));
      LObj.AddPair('status', LStatus);
      if LDoc <> '' then
        LObj.AddPair('documentNumber', LDoc)
      else
        LObj.AddPair('documentNumber', TJSONNull.Create);
      LObj.AddPair('notes', FieldStr('OBS_CTR'));

      LBuffer.Add(LObj); // Acumula em memória - NÃO envia HTTP ainda
      Q.Next;
    end;

    // Fecha o Firebird ANTES dos POSTs HTTP para evitar timeout de conexão ociosa
    Q.Close;
    QCount.Close;
    FDB.Connected := False;
    Log(Format('Registros carregados: %d. Iniciando envio para API...', [LBuffer.Count]));

    // FASE 2: Envia para a API (sem conexão Firebird ativa)
    LTotal := LBuffer.Count;
    LCurrent := 0;
    for LObj in LBuffer do
    begin
      Inc(LCurrent);
      Progress('Sincronizando contas a receber...', LCurrent, LTotal);
      if FAPI.SyncArTitle(LObj) then
        Inc(Result)
      else
        Log('Erro ao sincronizar conta a receber: ' + FAPI.LastErrorMessage);
    end;

    // Reconecta o Firebird para operações futuras
    FDB.Connected := True;

  finally
    Q.Free;
    QCount.Free;
    LBuffer.Free;
  end;
end;

function TSyncService.SyncLancamentos(ACodEmp: Integer): Integer;
var
  Q, QCount: TFDQuery;
  LObj: TJSONObject;
  LBuffer: TObjectList<TJSONObject>;
  LTotal, LCurrent: Integer;
  LOperation: string;
  LIssueDate, LPayDate: string;
  LCodCC: string;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  QCount := TFDQuery.Create(nil);
  LBuffer := TObjectList<TJSONObject>.Create(True);
  try
    Q.Connection := FDB;
    QCount.Connection := FDB;

    // Contagem para barra de progresso
    QCount.SQL.Text :=
      'SELECT COUNT(*) AS TOTAL ' +
      'FROM LANCAMENTOS_CONTAS_CORRENTE lc ' +
      'WHERE lc.COD_EMP = :COD_EMP';
    QCount.ParamByName('COD_EMP').AsInteger := ACodEmp;
    QCount.Open;
    LTotal := QCount.FieldByName('TOTAL').AsInteger;
    QCount.Close;
    Log(Format('Lan'#231'amentos encontrados: %d', [LTotal]));

    // FASE 1: Carrega registros do Firebird para mem'#243'ria
    Q.SQL.Text :=
      'SELECT lc.COD_LAN, lc.COD_CONTA, lc.DATAEMI_LAN, lc.DATAVENC_LAN, ' +
      '       lc.VALOR_LAN, lc.HISTORICO_LAN, lc.DC_LAN, lc.COD_CENTRAL_CUSTOS ' +
      'FROM LANCAMENTOS_CONTAS_CORRENTE lc ' +
      'WHERE lc.COD_EMP = :COD_EMP ' +
      'ORDER BY lc.COD_LAN';
    Q.ParamByName('COD_EMP').AsInteger := ACodEmp;
    Q.Open;

    LCurrent := 0;
    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Carregando lan'#231'amentos...', LCurrent, LTotal);

      // Mapeia DC_LAN: 0 = DEBITO (saída), 1 = CREDITO (entrada)
      if Q.FieldByName('DC_LAN').AsInteger = 0 then
        LOperation := 'DEBITO'
      else
        LOperation := 'CREDITO';

      // Formata data de emiss'#227'o
      LIssueDate := FormatDateTime('yyyy-mm-dd', Q.FieldByName('DATAEMI_LAN').AsDateTime);

      // Formata data de vencimento (pode ser nula)
      if Q.FieldByName('DATAVENC_LAN').IsNull then
        LPayDate := ''
      else
        LPayDate := FormatDateTime('yyyy-mm-dd', Q.FieldByName('DATAVENC_LAN').AsDateTime);

      // Centro de custo (pode ser nulo)
      if Q.FieldByName('COD_CENTRAL_CUSTOS').IsNull then
        LCodCC := ''
      else
        LCodCC := Trim(Q.FieldByName('COD_CENTRAL_CUSTOS').AsString);

      LObj := TJSONObject.Create;

      LObj.AddPair('externalId',   IntToStr(ACodEmp) + '-' + Q.FieldByName('COD_LAN').AsString);
      LObj.AddPair('accountCode',  Trim(Q.FieldByName('COD_CONTA').AsString));
      LObj.AddPair('issueDate',    LIssueDate);
      LObj.AddPair('amount',       TJSONNumber.Create(Q.FieldByName('VALOR_LAN').AsFloat));
      LObj.AddPair('operation',    LOperation);

      if LPayDate <> '' then
        LObj.AddPair('paymentDate', LPayDate)
      else
        LObj.AddPair('paymentDate', TJSONNull.Create);

      if Q.FieldByName('HISTORICO_LAN').IsNull then
        LObj.AddPair('history', TJSONNull.Create)
      else
        LObj.AddPair('history', Trim(Q.FieldByName('HISTORICO_LAN').AsString));

      if LCodCC <> '' then
        LObj.AddPair('costCenterCode', LCodCC)
      else
        LObj.AddPair('costCenterCode', TJSONNull.Create);

      LBuffer.Add(LObj);
      Q.Next;
    end;

    // Fecha o Firebird ANTES dos POSTs HTTP para evitar timeout de conex'#227'o ociosa
    Q.Close;
    QCount.Close;
    FDB.Connected := False;
    Log(Format('Registros carregados: %d. Iniciando envio para API...', [LBuffer.Count]));

    // FASE 2: Envia para a API (sem conex'#227'o Firebird ativa)
    LTotal := LBuffer.Count;
    LCurrent := 0;
    for LObj in LBuffer do
    begin
      Inc(LCurrent);
      Progress('Sincronizando lan'#231'amentos...', LCurrent, LTotal);
      if FAPI.SyncLedgerEntry(LObj) then
        Inc(Result)
      else
      begin
        if (Pos('(12002)', FAPI.LastErrorMessage) > 0) or (Pos('tempo limite', LowerCase(FAPI.LastErrorMessage)) > 0) then
        begin
          Sleep(2000);
          if FAPI.SyncLedgerEntry(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar lan'#231'amento: ' + FAPI.LastErrorMessage);
        end
        else
          Log('Erro ao sincronizar lan'#231'amento: ' + FAPI.LastErrorMessage);
      end;
    end;

    // Reconecta o Firebird para opera'#231#245'es futuras
    FDB.Connected := True;

  finally
    Q.Free;
    QCount.Free;
    LBuffer.Free;
  end;
end;

// -----------------------------------------------------------------------------
// SyncLancamentosCentroCusto
// Migra LANCAMENTOS_CENTRO_CUSTO → BankLedgerEntrySplit via POST /ledger/import-split
// Deve ser chamado logo após SyncLancamentos para que os lançamentos já existam.
// Mapeamento:
//   COD_LAN   → externalId  (mesmo formato: "{codEmp}-{codLan}")
//   C.CONTA   → chartAccountCode (código do plano de contas exibido na tela)
//   VALOR     → splitAmount
// -----------------------------------------------------------------------------
function TSyncService.SyncLancamentosCentroCusto(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LBuffer: TObjectList<TJSONObject>;
  LTotal, LCurrent: Integer;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  LBuffer := TObjectList<TJSONObject>.Create(True);
  try
    Q.Connection := FDB;

    // FASE 1: Carrega do banco para memória
    // Usa C.CONTA como código do plano de contas, conforme exibido na tela do ERP.
    Q.SQL.Text :=
      'SELECT lcc.COD_LAN, lcc.COD_CENTRO_CUSTO, c.CONTA, lcc.VALOR ' +
      'FROM LANCAMENTOS_CENTRO_CUSTO lcc ' +
      'INNER JOIN LANCAMENTOS_CONTAS_CORRENTE lc ON lc.COD_LAN = lcc.COD_LAN ' +
      'INNER JOIN CENTRO_CUSTO c ON c.CODIGO = lcc.COD_CENTRO_CUSTO ' +
      'WHERE lc.COD_EMP = :COD_EMP ' +
      'ORDER BY lcc.COD_LAN';
    Q.ParamByName('COD_EMP').AsInteger := ACodEmp;
    Q.Open;

    LTotal := Q.RecordCount;
    Log(Format('Lan'#231'amentos centro custo encontrados: %d', [LTotal]));

    LCurrent := 0;
    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Carregando centro custos...', LCurrent, LTotal);

      LObj := TJSONObject.Create;
      // externalId: mesmo padrão usado em SyncLancamentos
      LObj.AddPair('externalId',       IntToStr(ACodEmp) + '-' + Q.FieldByName('COD_LAN').AsString);
      LObj.AddPair('chartAccountCode', Trim(Q.FieldByName('CONTA').AsString));
      LObj.AddPair('splitAmount',      TJSONNumber.Create(Q.FieldByName('VALOR').AsFloat));

      LBuffer.Add(LObj);
      Q.Next;
    end;

    Q.Close;
    FDB.Connected := False;
    Log(Format('Registros carregados: %d. Enviando para API...', [LBuffer.Count]));

    // FASE 2: Envia para a API
    LTotal := LBuffer.Count;
    LCurrent := 0;
    for LObj in LBuffer do
    begin
      Inc(LCurrent);
      Progress('Sincronizando plano de contas...', LCurrent, LTotal);
      if FAPI.SyncLedgerSplit(LObj) then
        Inc(Result)
      else
      begin
        if (Pos('(12002)', FAPI.LastErrorMessage) > 0) or (Pos('tempo limite', LowerCase(FAPI.LastErrorMessage)) > 0) then
        begin
          Sleep(2000);
          if FAPI.SyncLedgerSplit(LObj) then
            Inc(Result)
          else
            Log('Erro ao sincronizar centro custo: ' + FAPI.LastErrorMessage);
        end
        else
          Log('Erro ao sincronizar centro custo: ' + FAPI.LastErrorMessage);
      end;
    end;

    FDB.Connected := True;

  finally
    Q.Free;
    LBuffer.Free;
  end;
end;

// ---------------------------------------------------------------------------
// SyncAtendimentos
// Lê atendimentos finalizados do MySQL (analitcs.ciloscloud.com.br/suporte)
// e importa para o FinanceHub via POST /support-tickets/import
// ---------------------------------------------------------------------------
function TSyncService.SyncAtendimentos(ACodEmp: Integer; AMySQLDB: TFDConnection; ADateFrom, ADateTo: TDateTime): Integer;
const
  SQL_ATENDIMENTOS =
    'SELECT ' +
    '  a.id_Atend, a.cod_cli, a.Obs_Atendimento, c.CIDRES_CLI, c.DATACADASTRO_CLI, ' +
    '  a.solucao, a.Data_hora_atendimento, a.Data_hora_finalizacao, a.nota, ' +
    '  a.departamento, a.protocolo, a.nome_cliente_atendimento, a.Tempo_atendimento, ' +
    '  a.Numero_cliente, c.NOME_CLI, c.NOMFAN_CLI, ' +
    '  (SELECT us.NOME_USU FROM usuario us WHERE us.COD_USU = a.cod_usu_lanc) AS USU_lanc, ' +
    '  (SELECT ucon.NOME_USU FROM usuario ucon WHERE ucon.COD_USU = a.cod_usu_conf_encerramento) AS USU_Conf_Enc, ' +
    '  (SELECT ua.NOME_USU FROM usuario ua WHERE ua.COD_USU = a.cod_tecnico) AS Uso_Atend, ' +
    '  (SELECT ua.NOME_USU FROM usuario ua WHERE ua.COD_USU = a.cod_desenvolvedor) AS nome_Desenvolvedor, ' +
    '  CAST(a.Data_hora_atendimento AS TIME) AS horat, ' +
    '  p.descricao, ' +
    '  (SELECT GROUP_CONCAT(pa.cod_procedimento ORDER BY pa.cod_procedimento SEPARATOR '', '') ' +
    '   FROM procedimentos_atendimentos pa WHERE pa.cod_atendimento = a.id_Atend) AS codigos_procedimento, ' +
    '  (SELECT GROUP_CONCAT(pr.descricao ORDER BY pr.descricao SEPARATOR '', '') ' +
    '   FROM procedimentos_atendimentos pa ' +
    '   INNER JOIN procedimentos pr ON pr.cod_procedimento = pa.cod_procedimento ' +
    '   WHERE pa.cod_atendimento = a.id_Atend) AS nomes_procedimento ' +
    'FROM atendimentos a ' +
    'INNER JOIN cliente c ON c.cod_cli = a.cod_cli ' +
    'INNER JOIN ponto_revenda p ON p.cod_ponto = c.cod_ponto_revenda ' +
    'WHERE a.Status_Atendimento = 7 ' +
    '  AND a.Data_hora_finalizacao >= :pDateFrom ' +
    '  AND a.Data_hora_finalizacao <= :pDateTo ' +
    'ORDER BY a.Data_hora_finalizacao';
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LBuffer: TObjectList<TJSONObject>;
  LTotal, LCurrent: Integer;
begin
  Result := 0;
  EnsureCompanyContext(ACodEmp);

  Q := TFDQuery.Create(nil);
  LBuffer := TObjectList<TJSONObject>.Create(True);
  try
    Q.Connection := AMySQLDB;
    Q.SQL.Text := SQL_ATENDIMENTOS;
    // Usa o início do dia de ADateFrom e o fim do dia de ADateTo
    Q.ParamByName('pDateFrom').AsDateTime := Int(ADateFrom);          // 00:00:00
    Q.ParamByName('pDateTo').AsDateTime   := Int(ADateTo) + 0.99999; // 23:59:59

    Log(Format('Filtro de finalização: %s até %s',
      [FormatDateTime('dd/mm/yyyy', ADateFrom),
       FormatDateTime('dd/mm/yyyy', ADateTo)]));

    // FASE 1: Carrega para memória
    Q.Open;
    LTotal := Q.RecordCount;
    Log(Format('Atendimentos encontrados: %d', [LTotal]));

    LCurrent := 0;
    while not Q.Eof do
    begin
      Inc(LCurrent);
      Progress('Carregando atendimentos...', LCurrent, LTotal);

      LObj := TJSONObject.Create;
      LObj.AddPair('externalId',             TJSONNumber.Create(Q.FieldByName('id_Atend').AsInteger));
      LObj.AddPair('codCli',                 TJSONNumber.Create(Q.FieldByName('cod_cli').AsInteger));
      LObj.AddPair('obsAtendimento',         Q.FieldByName('Obs_Atendimento').AsString);
      LObj.AddPair('cidRes',                 Q.FieldByName('CIDRES_CLI').AsString);
      // Datas em formato ISO para parsing correto no backend
      if Q.FieldByName('DATACADASTRO_CLI').IsNull then
        LObj.AddPair('dataCadastroCliente', '')
      else
        LObj.AddPair('dataCadastroCliente',
          FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Q.FieldByName('DATACADASTRO_CLI').AsDateTime));
      LObj.AddPair('solucao',                Q.FieldByName('solucao').AsString);
      if Q.FieldByName('Data_hora_atendimento').IsNull then
        LObj.AddPair('dataHoraAtendimento', '')
      else
        LObj.AddPair('dataHoraAtendimento',
          FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Q.FieldByName('Data_hora_atendimento').AsDateTime));
      if Q.FieldByName('Data_hora_finalizacao').IsNull then
        LObj.AddPair('dataHoraFinalizacao', '')
      else
        LObj.AddPair('dataHoraFinalizacao',
          FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Q.FieldByName('Data_hora_finalizacao').AsDateTime));
      if not Q.FieldByName('nota').IsNull then
        LObj.AddPair('nota', TJSONNumber.Create(Q.FieldByName('nota').AsFloat));
      // Se não houver código de departamento, vincula ao DESENVOLVIMENTO (erpCode=10)
      if Q.FieldByName('departamento').IsNull or (Trim(Q.FieldByName('departamento').AsString) = '') then
        LObj.AddPair('departamento', '10')
      else
        LObj.AddPair('departamento', Q.FieldByName('departamento').AsString);
      LObj.AddPair('protocolo',              Q.FieldByName('protocolo').AsString);
      LObj.AddPair('nomeClienteAtendimento', Q.FieldByName('nome_cliente_atendimento').AsString);
      LObj.AddPair('tempoAtendimento',       Q.FieldByName('Tempo_atendimento').AsString);
      LObj.AddPair('numeroCliente',          Q.FieldByName('Numero_cliente').AsString);
      // Usa nome fantasia se disponível; caso contrário usa razão social
      if (not Q.FieldByName('NOMFAN_CLI').IsNull) and (Trim(Q.FieldByName('NOMFAN_CLI').AsString) <> '') then
        LObj.AddPair('nomeCli', Q.FieldByName('NOMFAN_CLI').AsString)
      else
        LObj.AddPair('nomeCli', Q.FieldByName('NOME_CLI').AsString);
      LObj.AddPair('usuLanc',                Q.FieldByName('USU_lanc').AsString);
      LObj.AddPair('usuConfEnc',             Q.FieldByName('USU_Conf_Enc').AsString);
      LObj.AddPair('usuAtend',               Q.FieldByName('Uso_Atend').AsString);
      LObj.AddPair('nomeDesenvolvedor',      Q.FieldByName('nome_Desenvolvedor').AsString);
      LObj.AddPair('horaAtendimento',        Q.FieldByName('horat').AsString);
      LObj.AddPair('pontoRevenda',           Q.FieldByName('descricao').AsString);
      LObj.AddPair('codigosProcedimento',    Q.FieldByName('codigos_procedimento').AsString);
      LObj.AddPair('nomesProcedimento',      Q.FieldByName('nomes_procedimento').AsString);
      LObj.AddPair('obsAtendimento',         Q.FieldByName('Obs_Atendimento').AsString);

      LBuffer.Add(LObj);
      Q.Next;
    end;

    Q.Close;
    Log(Format('Registros carregados: %d. Enviando para API...', [LBuffer.Count]));

    // FASE 2: Envia para a API
    LTotal := LBuffer.Count;
    LCurrent := 0;
    for LObj in LBuffer do
    begin
      Inc(LCurrent);
      Progress('Sincronizando atendimentos...', LCurrent, LTotal);
      if FAPI.SyncSupportTicket(LObj) then
        Inc(Result)
      else
        Log('Erro ao sincronizar atendimento: ' + FAPI.LastErrorMessage);
    end;

  finally
    Q.Free;
    LBuffer.Free;
  end;
end;

end.
