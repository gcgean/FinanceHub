unit uSyncService;

interface

uses
  System.SysUtils, System.JSON, FireDAC.Comp.Client, uFinanceHubAPI, uDM, FireDAC.DApt,
  System.Generics.Collections;

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
    function SyncCustomerDeactivationReasons(ACodEmp: Integer): Integer;
    function SyncCustomerDeactivationHistory(ACodEmp: Integer): Integer;
    function SyncSuppliers(ACodEmp: Integer): Integer;
    function SyncProductSections(ACodEmp: Integer): Integer;
    function SyncProductGroups(ACodEmp: Integer): Integer;
    function SyncProductSubgroups(ACodEmp: Integer): Integer;
    function SyncProductManufacturers(ACodEmp: Integer): Integer;
    function SyncProducts(ACodEmp: Integer): Integer;
    function SyncPaymentTerms(ACodEmp: Integer): Integer;
    function SyncSales(ACodEmp: Integer): Integer;
    function SyncApTitles(ACodEmp: Integer): Integer;
    function SyncArTitles(ACodEmp: Integer): Integer;
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

function TSyncService.SyncCustomers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  QCount: TFDQuery;
  LObj: TJSONObject;
  LDoc: string;
  LTotal: Integer;
  LCurrent: Integer;
  
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
    QCount.SQL.Text := 'SELECT COUNT(*) AS CNT FROM CLIENTE';
    QCount.Open;
    LTotal := QCount.FieldByName('CNT').AsInteger;

    Q.Connection := FDB;
    // Cadastro de cliente não é vinculado à empresa: sincroniza todos
    Q.SQL.Text := 'SELECT * FROM CLIENTE';
    Q.Open;
    
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
        LObj.AddPair('neighborhood', Q.FieldByName('BAIRES_CLI').AsString);
        
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
    Q.SQL.Text := 'SELECT DISTINCT COD_SEC, SECAO FROM PRODUTO WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LName := Trim(Q.FieldByName('SECAO').AsString);
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
    Q.SQL.Text := 'SELECT DISTINCT COD_GRUPO, GRUPO, COD_SEC, SECAO FROM PRODUTO WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_GRUPO').AsString);
      LName := Trim(Q.FieldByName('GRUPO').AsString);
      LSectionCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LSectionName := Trim(Q.FieldByName('SECAO').AsString);
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
    Q.SQL.Text := 'SELECT DISTINCT SUB_GRUPO, SUBGRUPO, COD_GRUPO, GRUPO, COD_SEC, SECAO FROM PRODUTO WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('SUB_GRUPO').AsString);
      LName := Trim(Q.FieldByName('SUBGRUPO').AsString);
      LGroupCode := Trim(Q.FieldByName('COD_GRUPO').AsString);
      LGroupName := Trim(Q.FieldByName('GRUPO').AsString);
      LSectionCode := Trim(Q.FieldByName('COD_SEC').AsString);
      LSectionName := Trim(Q.FieldByName('SECAO').AsString);
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
    Q.SQL.Text := 'SELECT DISTINCT COD_FABRICANTE, FABRICANTE FROM PRODUTO WHERE COD_EMP = :CodEmp';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    Q.Open;
    while not Q.Eof do
    begin
      LCode := Trim(Q.FieldByName('COD_FABRICANTE').AsString);
      LName := Trim(Q.FieldByName('FABRICANTE').AsString);
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

function TSyncService.SyncSales(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LItems: TJSONArray;
  LItem: TJSONObject;
begin
  Result := 0;
  // Exemplo mais complexo (Mestre-Detalhe)
  {
    Q.SQL.Text := 'SELECT ID, DATA, TOTAL, ID_CLIENTE FROM VENDAS WHERE COD_EMP = :CodEmp ...';
    Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    ...
    LObj.AddPair('companyId', IntToStr(ACodEmp));
    LObj.AddPair('externalId', ...);
    LObj.AddPair('date', FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Q.FieldByName('DATA').AsDateTime));
    
    // Itens
    LItems := TJSONArray.Create;
    QItems.SQL.Text := 'SELECT * FROM VENDA_ITENS WHERE ID_VENDA = :ID';
    ...
    while not QItems.Eof do
      LItem := TJSONObject.Create;
      LItem.AddPair('productId', ...); // Precisa ser o ID do produto no FinanceHub ou externalId se a API suportar (atualmente suporta productId interno)
      // Nota: A API de Sales espera productId (interno). Se você só tem o código do produto do ERP,
      // precisará primeiro buscar o produto no FinanceHub pelo código ou ajustar a API para aceitar externalProductId.
      LItems.AddElement(LItem);
    end;
    LObj.AddPair('items', LItems);
    
    FAPI.SyncSale(LObj);
  }
end;

function TSyncService.SyncApTitles(ACodEmp: Integer): Integer;
begin
  Result := 0;
  // Implementar Contas a Pagar
end;

function TSyncService.SyncArTitles(ACodEmp: Integer): Integer;
begin
  Result := 0;
  // Implementar Contas a Receber
end;

end.
