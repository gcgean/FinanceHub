unit uSyncService;

interface

uses
  System.SysUtils, System.JSON, FireDAC.Comp.Client, uFinanceHubAPI, uDM, FireDAC.DApt;

type
  TSyncService = class
  private
    FAPI: TFinanceHubAPI;
    FDB: TFDConnection;
    procedure Log(const AMsg: string);
  public
    constructor Create(AAPI: TFinanceHubAPI; ADB: TFDConnection);
    
    function SyncCompany(ACodEmp: Integer): Boolean;
    function SyncAccounts(ACodEmp: Integer): Integer;
    function SyncCustomers(ACodEmp: Integer): Integer;
    function SyncSuppliers(ACodEmp: Integer): Integer;
    function SyncProducts(ACodEmp: Integer): Integer;
    function SyncSales(ACodEmp: Integer): Integer;
    function SyncApTitles(ACodEmp: Integer): Integer;
    function SyncArTitles(ACodEmp: Integer): Integer;
  end;

implementation

constructor TSyncService.Create(AAPI: TFinanceHubAPI; ADB: TFDConnection);
begin
  FAPI := AAPI;
  FDB := ADB;
end;

procedure TSyncService.Log(const AMsg: string);
begin
  // Implementar log em arquivo ou memo na tela principal
  // Por enquanto apenas writeln ou similar se fosse console
end;

function TSyncService.SyncCompany(ACodEmp: Integer): Boolean;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LResp: TJSONValue;
  LFinanceHubId: string;
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
        LObj.AddPair('cnpj', Q.FieldByName('CNPJ_EMP').AsString);
        LObj.AddPair('email', Q.FieldByName('EMAIL').AsString);
        LObj.AddPair('phone', Q.FieldByName('TEL_EMP').AsString);
        
        // Sincroniza e obtém o ID do FinanceHub
        Result := FAPI.SyncCompany(LObj, LFinanceHubId);
        
        if Result and (LFinanceHubId <> '') then
        begin
          // Define o ID da empresa para as próximas requisições
          FAPI.SetCompanyId(LFinanceHubId);
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

function TSyncService.SyncCustomers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
  LCount: Integer;
begin
  Result := 0;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := FDB;
    // Seleciona clientes, filtrando por empresa se a tabela CLIENTES tiver COD_EMP (verificar esquema)
    // Assumindo que CLIENTES é global ou tem COD_EMP. Se for global, remove o filtro.
    // O usuário disse "separados pela empresa", então assumimos que deve haver algum filtro.
    // Se a tabela CLIENTES não tiver COD_EMP, talvez seja tabela compartilhada.
    // Vamos assumir por hora que enviamos todos ou que existe filtro.
    // Ajuste conforme o esquema real da tabela CLIENTES.
    Q.SQL.Text := 'SELECT CODIGO, NOME, CNPJ_CPF, EMAIL, FONE, CIDADE, UF FROM CLIENTES WHERE DATA_ALTERACAO >= :DataCorte'; 
    // Se tiver campo de empresa: AND COD_EMP = :CodEmp
    // Q.ParamByName('CodEmp').AsInteger := ACodEmp;
    
    // Q.ParamByName('DataCorte').AsDateTime := ...; // Pegar última data de sync
    Q.Open;
    
    while not Q.Eof do
    begin
      LObj := TJSONObject.Create;
      try
        // Não envia companyId no corpo, pois a API usa o header x-company-id
        LObj.AddPair('externalId', Q.FieldByName('CODIGO').AsString);
        LObj.AddPair('name', Q.FieldByName('NOME').AsString);
        LObj.AddPair('document', Q.FieldByName('CNPJ_CPF').AsString);
        LObj.AddPair('email', Q.FieldByName('EMAIL').AsString);
        LObj.AddPair('phone', Q.FieldByName('FONE').AsString);
        LObj.AddPair('city', Q.FieldByName('CIDADE').AsString);
        LObj.AddPair('state', Q.FieldByName('UF').AsString);
        
        if FAPI.SyncCustomer(LObj) then
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

function TSyncService.SyncSuppliers(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
begin
  Result := 0;
  // Implementar similar ao SyncCustomers mas lendo FORNECEDORES e chamando FAPI.SyncSupplier
end;

function TSyncService.SyncProducts(ACodEmp: Integer): Integer;
var
  Q: TFDQuery;
  LObj: TJSONObject;
begin
  Result := 0;
  // Implementar lendo PRODUTOS e chamando FAPI.SyncProduct
  // Campos esperados: externalId, name, code, salePrice, costPrice...
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