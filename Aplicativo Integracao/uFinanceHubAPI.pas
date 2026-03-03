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
    function Get(const AResource: string; const AQuery: array of string): TJSONValue;
    function Patch(const AResource: string; const ABody: TJSONObject): TJSONValue;
  public
    constructor Create(const ABaseURL: string);
    function Login(const AEmail, APassword: string): Boolean;
    procedure SetCompanyId(const AId: string);
    function SyncCompany(ACompany: TJSONObject; out AFinanceHubId: string): Boolean;
    function ResolveCompanyId(const ACnpj: string): string;
    function SyncAccount(AAccount: TJSONObject): Boolean;
    function SyncCostCenter(ACostCenter: TJSONObject): Boolean;
    function SyncChartAccount(AChartAccount: TJSONObject; out AId: string): Boolean;
    function SyncCustomer(ACustomer: TJSONObject): Boolean;
    function SyncCustomerDeactivationReason(AMotivo: TJSONObject): Boolean;
    function CreateCustomerDeactivation(const ACustomerId: string; ABody: TJSONObject): Boolean;
    function ListCustomers(ATake, ASkip: Integer): TJSONArray;
    function ListCustomerDeactivationReasons: TJSONArray;
    function SyncSupplier(ASupplier: TJSONObject): Boolean;
    function SyncProductSection(ASection: TJSONObject): Boolean;
    function SyncProductGroup(AGroup: TJSONObject): Boolean;
    function SyncProductSubgroup(ASubgroup: TJSONObject): Boolean;
    function SyncProductManufacturer(AManufacturer: TJSONObject): Boolean;
    function SyncProduct(AProduct: TJSONObject): Boolean;
    function SyncSale(ASale: TJSONObject): Boolean;
    function SyncApTitle(AApTitle: TJSONObject): Boolean;
    function SyncArTitle(AArTitle: TJSONObject): Boolean;
    
    property Token: string read FToken;
    property CompanyId: string read FCompanyId;
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
  function ShouldSendCompanyHeader(const R: string): Boolean;
  begin
    Result :=
      (FCompanyId <> '') and
      (not SameText(R, 'auth/login')) and
      (not SameText(R, 'companies')) and
      (not SameText(Copy(R, 1, 10), 'companies/'));
  end;
begin
  Result := nil;
  FLastErrorMessage := '';
  
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
    
    DM.RESTRequest1.Params.Clear;
    DM.RESTRequest1.Params.AddItem('Content-Type', 'application/json', pkHTTPHEADER, [poDoNotEncode]);

    if FToken <> '' then
      DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);

    if ShouldSendCompanyHeader(AResource) then
      DM.RESTRequest1.Params.AddItem('x-company-id', FCompanyId, pkHTTPHEADER, [poDoNotEncode]);

    DM.RESTRequest1.Body.ClearBody;
    if Assigned(ABody) then
      DM.RESTRequest1.Body.Add(ABody.ToString, ctAPPLICATION_JSON);
    
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
        if Assigned(DM) and Assigned(DM.RESTResponse1) and (DM.RESTResponse1.Content <> '') then
          FLastErrorMessage := FLastErrorMessage + ' | ' + DM.RESTResponse1.Content;
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

function TFinanceHubAPI.Get(const AResource: string; const AQuery: array of string): TJSONValue;
  function ShouldSendCompanyHeader(const R: string): Boolean;
  begin
    Result :=
      (FCompanyId <> '') and
      (not SameText(R, 'auth/login')) and
      (not SameText(R, 'companies')) and
      (not SameText(Copy(R, 1, 10), 'companies/'));
  end;
var
  I: Integer;
begin
  Result := nil;
  FLastErrorMessage := '';
  
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
    DM.RESTRequest1.Method := rmGET;
    
    DM.RESTRequest1.Params.Clear;
    DM.RESTRequest1.Params.AddItem('Content-Type', 'application/json', pkHTTPHEADER, [poDoNotEncode]);

    if FToken <> '' then
      DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);

    if ShouldSendCompanyHeader(AResource) then
      DM.RESTRequest1.Params.AddItem('x-company-id', FCompanyId, pkHTTPHEADER, [poDoNotEncode]);

    I := 0;
    while I < Length(AQuery) - 1 do
    begin
      DM.RESTRequest1.Params.AddItem(AQuery[I], AQuery[I + 1], pkGETorPOST);
      Inc(I, 2);
    end;

    try
      DM.RESTRequest1.Execute;
      
      if (DM.RESTResponse1.StatusCode >= 200) and (DM.RESTResponse1.StatusCode < 300) then
      begin
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content)
        else
          Result := TJSONObject.Create;
      end
      else
      begin
        FLastErrorMessage := Format('Erro API (%d): %s', [DM.RESTResponse1.StatusCode, DM.RESTResponse1.Content]);
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content);
      end;
    except
      on E: Exception do
      begin
        FLastErrorMessage := 'Erro na requisição: ' + E.Message;
        if Assigned(DM) and Assigned(DM.RESTResponse1) and (DM.RESTResponse1.Content <> '') then
          FLastErrorMessage := FLastErrorMessage + ' | ' + DM.RESTResponse1.Content;
        Result := nil;
      end;
    end;
  except
    on E: Exception do
    begin
      FLastErrorMessage := 'Erro interno no método Get: ' + E.Message;
      Result := nil;
    end;
  end;
end;

function TFinanceHubAPI.Patch(const AResource: string; const ABody: TJSONObject): TJSONValue;
  function ShouldSendCompanyHeader(const R: string): Boolean;
  begin
    Result :=
      (FCompanyId <> '') and
      (not SameText(R, 'auth/login')) and
      (not SameText(R, 'companies')) and
      (not SameText(Copy(R, 1, 10), 'companies/'));
  end;
begin
  Result := nil;
  FLastErrorMessage := '';
  
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
    DM.RESTRequest1.Method := rmPATCH;
    
    DM.RESTRequest1.Params.Clear;
    DM.RESTRequest1.Params.AddItem('Content-Type', 'application/json', pkHTTPHEADER, [poDoNotEncode]);

    if FToken <> '' then
      DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);

    if ShouldSendCompanyHeader(AResource) then
      DM.RESTRequest1.Params.AddItem('x-company-id', FCompanyId, pkHTTPHEADER, [poDoNotEncode]);

    DM.RESTRequest1.Body.ClearBody;
    if Assigned(ABody) then
      DM.RESTRequest1.Body.Add(ABody.ToString, ctAPPLICATION_JSON);
    
    try
      DM.RESTRequest1.Execute;
      
      if (DM.RESTResponse1.StatusCode >= 200) and (DM.RESTResponse1.StatusCode < 300) then
      begin
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content)
        else
          Result := TJSONObject.Create;
      end
      else
      begin
        FLastErrorMessage := Format('Erro API (%d): %s', [DM.RESTResponse1.StatusCode, DM.RESTResponse1.Content]);
        if DM.RESTResponse1.Content <> '' then
          Result := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content);
      end;
    except
      on E: Exception do
      begin
        FLastErrorMessage := 'Erro na requisição: ' + E.Message;
        if Assigned(DM) and Assigned(DM.RESTResponse1) and (DM.RESTResponse1.Content <> '') then
          FLastErrorMessage := FLastErrorMessage + ' | ' + DM.RESTResponse1.Content;
        Result := nil;
      end;
    end;
  except
    on E: Exception do
    begin
      FLastErrorMessage := 'Erro interno no método Patch: ' + E.Message;
      Result := nil;
    end;
  end;
end;

// Métodos de Sincronização

procedure TFinanceHubAPI.SetCompanyId(const AId: string);
begin
  FCompanyId := AId;
end;

function TFinanceHubAPI.SyncCompany(ACompany: TJSONObject; out AFinanceHubId: string): Boolean;
var
  LResp: TJSONValue;
  LVal: TJSONValue;
begin
  AFinanceHubId := '';
  // Utiliza a rota /companies (requer token ADMIN)
  LResp := Post('companies', ACompany);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar empresa.';
     
  if Result and (LResp is TJSONObject) then
  begin
    LVal := TJSONObject(LResp).GetValue('id');
    if Assigned(LVal) then
      AFinanceHubId := LVal.Value;
  end;
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.ResolveCompanyId(const ACnpj: string): string;
var
  LCnpjRaw: string;
  LCnpjNorm: string;
  LQuery: string;

  function NormalizeDoc(const S: string): string;
  var
    C: Char;
  begin
    Result := '';
    for C in S do
      if CharInSet(C, ['0'..'9']) then
        Result := Result + C;
  end;

  function TryResolve(const Q: string): string;
  var
    LResp: TJSONValue;
    LArr: TJSONArray;
    J: Integer;
    LItem: TJSONObject;
    LVal: TJSONValue;
  begin
    Result := '';

    DM.RESTRequest1.Client := DM.RESTClient1;
    DM.RESTRequest1.Response := DM.RESTResponse1;
    DM.RESTRequest1.Resource := 'companies';
    DM.RESTRequest1.Method := rmGET;
    DM.RESTRequest1.Params.Clear;
    DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);
    DM.RESTRequest1.Params.AddItem('q', Q, pkGETorPOST);

    DM.RESTRequest1.Execute;

    if (DM.RESTResponse1.StatusCode >= 200) and (DM.RESTResponse1.StatusCode < 300) then
    begin
      LResp := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content);
      try
        if LResp is TJSONObject then
        begin
          LVal := TJSONObject(LResp).GetValue('items');
          if (LVal is TJSONArray) then
          begin
            LArr := TJSONArray(LVal);
            for J := 0 to LArr.Count - 1 do
            begin
              LItem := TJSONObject(LArr.Items[J]);
              LVal := LItem.GetValue('cnpj');
              if Assigned(LVal) then
              begin
                if NormalizeDoc(LVal.Value) = LCnpjNorm then
                begin
                  LVal := LItem.GetValue('id');
                  if Assigned(LVal) then
                  begin
                    Result := LVal.Value;
                    Exit;
                  end;
                end;
              end;
            end;
            if (Result = '') and (LArr.Count = 1) then
            begin
              LVal := TJSONObject(LArr.Items[0]).GetValue('id');
              if Assigned(LVal) then
                Result := LVal.Value;
            end;
          end;
        end;
      finally
        LResp.Free;
      end;
    end;
  end;
begin
  Result := '';
  // Lista empresas filtrando por query (q=CNPJ)
  // A rota GET /companies aceita ?q=...
  if ACnpj = '' then Exit;
  
  // Como o método GET genérico não suporta query params diretos no helper,
  // vamos montar a URL manualmente ou ajustar o GET.
  // Assumindo que o método Get suporta apenas resource path.
  // GET /companies?q=CNPJ
  
  if not Assigned(DM) then Exit;

  try
    LCnpjRaw := Trim(ACnpj);
    LCnpjNorm := NormalizeDoc(LCnpjRaw);

    if LCnpjNorm = '' then
      Exit;

    LQuery := LCnpjRaw;
    Result := TryResolve(LQuery);
    if Result = '' then
      Result := TryResolve(LCnpjNorm);
  except
    // Log error silently
  end;
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

function TFinanceHubAPI.SyncCostCenter(ACostCenter: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  // Rota /cost-centers
  LResp := Post('cost-centers', ACostCenter);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar centro de custos.';
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncChartAccount(AChartAccount: TJSONObject; out AId: string): Boolean;
var
  LResp: TJSONValue;
  LVal: TJSONValue;
begin
  AId := '';
  // Rota /chart-accounts
  LResp := Post('chart-accounts', AChartAccount);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar plano de contas.';
     
  if Result and (LResp is TJSONObject) then
  begin
    LVal := TJSONObject(LResp).GetValue('id');
    if Assigned(LVal) then
      AId := LVal.Value;
  end;
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncCustomer(ACustomer: TJSONObject): Boolean;
var
  LResp: TJSONValue;
  LId: string;
  LDocKey: string;
  LDocVal: TJSONValue;

  function NormalizeDoc(const S: string): string;
  var
    C: Char;
  begin
    Result := '';
    for C in S do
      if C in ['0'..'9'] then
        Result := Result + C;
  end;

  function DocKeyFromDigits(const Digits: string): string;
  begin
    if Length(Digits) = 14 then
      Result := Copy(Digits, 1, 8)
    else if Length(Digits) = 11 then
      Result := Digits
    else
      Result := Digits;
  end;

  function FindExistingCustomerIdByDocKey(const AKey: string): string;
  var
    LJson: TJSONValue;
    LItemsVal: TJSONValue;
    LItems: TJSONArray;
    LItem: TJSONObject;
    LItemDoc: TJSONValue;
    LItemId: TJSONValue;
    J: Integer;
    LKeyItem: string;
  begin
    Result := '';
    if AKey = '' then Exit;
    if not Assigned(DM) then Exit;

    DM.RESTRequest1.Client := DM.RESTClient1;
    DM.RESTRequest1.Response := DM.RESTResponse1;
    DM.RESTRequest1.Resource := 'customers';
    DM.RESTRequest1.Method := rmGET;
    DM.RESTRequest1.Params.Clear;
    DM.RESTRequest1.Params.AddItem('Authorization', 'Bearer ' + FToken, pkHTTPHEADER, [poDoNotEncode]);
    if FCompanyId <> '' then
      DM.RESTRequest1.Params.AddItem('x-company-id', FCompanyId, pkHTTPHEADER, [poDoNotEncode]);
    DM.RESTRequest1.Params.AddItem('q', AKey, pkGETorPOST);
    DM.RESTRequest1.Params.AddItem('take', '50', pkGETorPOST);
    DM.RESTRequest1.Params.AddItem('skip', '0', pkGETorPOST);

    DM.RESTRequest1.Execute;
    if not ((DM.RESTResponse1.StatusCode >= 200) and (DM.RESTResponse1.StatusCode < 300)) then
      Exit;

    LJson := TJSONObject.ParseJSONValue(DM.RESTResponse1.Content);
    if not Assigned(LJson) then Exit;
    try
      if not (LJson is TJSONObject) then Exit;
      LItemsVal := TJSONObject(LJson).GetValue('items');
      if not (LItemsVal is TJSONArray) then Exit;
      LItems := TJSONArray(LItemsVal);
      for J := 0 to LItems.Count - 1 do
      begin
        if not (LItems.Items[J] is TJSONObject) then
          Continue;
        LItem := TJSONObject(LItems.Items[J]);
        LItemDoc := LItem.GetValue('document');
        if not Assigned(LItemDoc) then
          Continue;
        LKeyItem := DocKeyFromDigits(NormalizeDoc(LItemDoc.Value));
        if (LKeyItem <> '') and (LKeyItem = AKey) then
        begin
          LItemId := LItem.GetValue('id');
          if Assigned(LItemId) then
          begin
            Result := LItemId.Value;
            Exit;
          end;
        end;
      end;
    finally
      LJson.Free;
    end;
  end;
begin
  LId := '';
  LDocKey := '';

  if Assigned(ACustomer) then
  begin
    LDocVal := ACustomer.GetValue('document');
    if Assigned(LDocVal) then
      LDocKey := DocKeyFromDigits(NormalizeDoc(LDocVal.Value));
    LId := FindExistingCustomerIdByDocKey(LDocKey);
  end;

  if LId <> '' then
    LResp := Patch('customers/' + LId, ACustomer)
  else
    LResp := Post('customers', ACustomer);

  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar cliente.';
     
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncSupplier(ASupplier: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('suppliers', ASupplier);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncCustomerDeactivationReason(AMotivo: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('customers/deactivation-reasons', AMotivo);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar motivo de desativação.';
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.CreateCustomerDeactivation(const ACustomerId: string; ABody: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('customers/' + ACustomerId + '/deactivations', ABody);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if not Result and (FLastErrorMessage = '') then
     FLastErrorMessage := 'Falha desconhecida ao sincronizar histórico de desativação.';
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.ListCustomers(ATake, ASkip: Integer): TJSONArray;
var
  LResp: TJSONValue;
  LItemsVal: TJSONValue;
begin
  Result := nil;
  LResp := Get('customers', ['take', IntToStr(ATake), 'skip', IntToStr(ASkip)]);
  if Assigned(LResp) then
  try
    if LResp is TJSONObject then
    begin
      LItemsVal := TJSONObject(LResp).GetValue('items');
      if LItemsVal is TJSONArray then
        Result := TJSONArray(LItemsVal.Clone);
    end;
  finally
    LResp.Free;
  end;
end;

function TFinanceHubAPI.ListCustomerDeactivationReasons: TJSONArray;
var LResp: TJSONValue;
begin
  Result := nil;
  LResp := Get('customers/deactivation-reasons', []);
  if Assigned(LResp) then
  try
    if LResp is TJSONArray then
      Result := TJSONArray(LResp.Clone);
  finally
    LResp.Free;
  end;
end;

function TFinanceHubAPI.SyncProductSection(ASection: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('products/sections', ASection);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncProductGroup(AGroup: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('products/groups', AGroup);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncProductSubgroup(ASubgroup: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('products/subgroups', ASubgroup);
  Result := (Assigned(LResp)) and (FLastErrorMessage = '');
  if Assigned(LResp) then LResp.Free;
end;

function TFinanceHubAPI.SyncProductManufacturer(AManufacturer: TJSONObject): Boolean;
var LResp: TJSONValue;
begin
  LResp := Post('products/manufacturers', AManufacturer);
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
