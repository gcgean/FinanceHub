unit uFinanceHubAPI;

interface

uses
  System.SysUtils, System.JSON, REST.Client, REST.Types, uDM,
  FireDAC.Comp.Client;

type
  TFinanceHubAPI = class
  private
    FToken: string;
    FBaseURL: string;
    FCompanyId: string; // ID da empresa no FinanceHub (UUID)
    FLastErrorMessage: string;
    function Post(const AResource: string; const ABody: TJSONObject): TJSONValue;
    function Get(const AResource: string): TJSONValue;
  public
    constructor Create(const ABaseURL: string);
    function Login(const AEmail, APassword: string): Boolean;
    procedure SetCompanyId(const AId: string);
    function SyncCompany(ACompany: TJSONObject; out AFinanceHubId: string): Boolean;
    function SyncAccount(AAccount: TJSONObject): Boolean;
    function SyncCustomer(ACustomer: TJSONObject): Boolean;
    function SyncSupplier(ASupplier: TJSONObject): Boolean;
    function SyncProduct(AProduct: TJSONObject): Boolean;
    function SyncSale(ASale: TJSONObject): Boolean;
    function SyncApTitle(AApTitle: TJSONObject): Boolean;
    function SyncArTitle(AArTitle: TJSONObject): Boolean;
    
    property Token: string read FToken;
    property LastErrorMessage: string read FLastErrorMessage;
  end;

implementation

constructor TFinanceHubAPI.Create(const ABaseURL: string);
begin
  FBaseURL := ABaseURL;
  // Garante que DM existe antes de acessar
  if Assigned(DM) and Assigned(DM.RESTClient1) then
  begin
    if DM.RESTClient1.BaseURL = '' then
      DM.RESTClient1.BaseURL := ABaseURL;
  end;
end;

function TFinanceHubAPI.Login(const AEmail, APassword: string): Boolean;
var
  LBody: TJSONObject;
  LResp: TJSONValue;
  LTokenVal: TJSONValue;
begin
  Result := False;
  FLastErrorMessage := '';
  
  LBody := TJSONObject.Create;
  try
    LBody.AddPair('email', AEmail);
    LBody.AddPair('password', APassword);
    
    LResp := Post('auth/login', LBody);
    if Assigned(LResp) then
    try
      if LResp is TJSONObject then
      begin
        LTokenVal := TJSONObject(LResp).GetValue('token');
        
        if Assigned(LTokenVal) then
        begin
          FToken := LTokenVal.Value;
          Result := True;
        end
        else
        begin
          // Tenta ler mensagem de erro da API se não vier token
          LTokenVal := TJSONObject(LResp).GetValue('message');
          if Assigned(LTokenVal) then
            FLastErrorMessage := LTokenVal.Value
          else
            FLastErrorMessage := 'Resposta desconhecida da API: ' + LResp.ToString;
        end;
      end;
    finally
      LResp.Free;
    end;
  finally
    LBody.Free;
  end;
end;

function TFinanceHubAPI.Post(const AResource: string; const ABody: TJSONObject): TJSONValue;
begin
  Result := nil;
  
  if not Assigned(DM) then
  begin
    FLastErrorMessage := 'DataModule (DM) não criado.';
    Exit;
  end;

  if not Assigned(DM.RESTRequest1) then
  begin
    FLastErrorMessage := 'Componente RESTRequest1 não criado no DM.';
    Exit;
  end;

  if not Assigned(DM.RESTClient1) then
  begin
    FLastErrorMessage := 'Componente RESTClient1 não criado no DM.';
    Exit;
  end;

  if not Assigned(DM.RESTResponse1) then
  begin
    FLastErrorMessage := 'Componente RESTResponse1 não criado no DM.';
    Exit;
  end;

  try
    DM.RESTRequest1.Client := DM.RESTClient1;
    DM.RESTRequest1.Response := DM.RESTResponse1;
    DM.RESTRequest1.Resource := AResource;
    DM.RESTRequest1.Method := rmPOST;
    
    if FToken <> '' then
    begin
      DM.RESTRequest1.Params.Clear;
      DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);
      
      if FCompanyId <> '' then
        DM.RESTRequest1.Params.AddItem('x-company-id', FCompanyId, pkHTTPHEADER, [poDoNotEncode]);
    end;
    
    if Assigned(ABody) then
    begin
      DM.RESTRequest1.Body.ClearBody;
      DM.RESTRequest1.Body.Add(ABody.ToString, ctAPPLICATION_JSON);
    end;
    
    try
      DM.RESTRequest1.Execute;
      
      // Verifica status HTTP
      if (DM.RESTResponse1.StatusCode >= 200) and (DM.RESTResponse1.StatusCode < 300) then
      begin
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content)
        else
          Result := TJSONObject.Create; // Sucesso vazio
      end
      else
      begin
        // Erro HTTP (400, 401, 500, etc.)
        FLastErrorMessage := Format('Erro API (%d): %s', [DM.RESTResponse1.StatusCode, DM.RESTResponse1.Content]);
        // Tenta retornar o JSON de erro para análise se possível, ou nil
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content);
      end;
    except
      on E: Exception do
      begin
        FLastErrorMessage := 'Erro na requisição: ' + E.Message;
        Result := nil;
      end;
    end;
  except
    on E: Exception do
    begin
      FLastErrorMessage := 'Erro interno no método Post: ' + E.Message;
      Result := nil;
    end;
  end;
end;

function TFinanceHubAPI.Get(const AResource: string): TJSONValue;
begin
  Result := nil;
end;

// Métodos de Sincronização

procedure TFinanceHubAPI.SetCompanyId(const AId: string);
begin
  FCompanyId := AId;
end;

function TFinanceHubAPI.SyncCompany(ACompany: TJSONObject; out AFinanceHubId: string): Boolean;
var LResp: TJSONValue;
begin
  AFinanceHubId := '';
  // Utiliza a rota /companies (requer token ADMIN)
  LResp := Post('companies', ACompany);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar empresa.';
     
  if Result and (LResp is TJSONObject) then
  begin
    var LVal := TJSONObject(LResp).GetValue('id');
    if Assigned(LVal) then
      AFinanceHubId := LVal.Value;
  end;
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncAccount(AAccount: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  // Rota /accounts
  LResp := Post('accounts', AAccount);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar conta bancária.';
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncCustomer(ACustomer: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/customers', ACustomer);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar cliente.';
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncSupplier(ASupplier: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/suppliers', ASupplier);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncProduct(AProduct: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/products', AProduct);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncSale(ASale: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/sales', ASale);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncApTitle(AApTitle: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/ap-titles', AApTitle);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncArTitle(AArTitle: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('canonical/ar-titles', AArTitle);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

end.