UNIT uMain;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes, Vcl.Graphics,
  Vcl.Controls, Vcl.Forms, Vcl.Dialogs, Vcl.StdCtrls, uDM, uFinanceHubAPI, uSyncService,
  FireDAC.Comp.Client, Vcl.CheckLst, FireDAC.DApt; // Adicionado FireDAC.DApt para TFDQuery

type
  TfrmMain = class(TForm)
    btnConnectDB: TButton;
    btnLoginAPI: TButton;
    btnSync: TButton;
    MemoLog: TMemo;
    edtEmail: TEdit;
    edtPass: TEdit;
    Label1: TLabel;
    Label2: TLabel;
    Label4: TLabel;
    clbEmpresas: TCheckListBox;
    clbEntidades: TCheckListBox;
    procedure btnConnectDBClick(Sender: TObject);
    procedure btnLoginAPIClick(Sender: TObject);
    procedure btnSyncClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
  private
    FAPI: TFinanceHubAPI;
    FSync: TSyncService;
    procedure Log(const AMsg: string);
    procedure CarregarEmpresas;
  public
    { Public declarations }
  end;

var
  frmMain: TfrmMain;

implementation

{$R *.dfm}

procedure TfrmMain.FormCreate(Sender: TObject);
begin
  // URL do servidor de produção/homologação
  // IP Local detectado: 127.0.0.1 (localhost) ou 26.191.165.250
  // O IP 26.241.132.21 responde com latência (~15ms), indicando ser uma máquina remota na VPN.
  // Como o backend está rodando LOCALMENTE, usamos localhost.
  FAPI := TFinanceHubAPI.Create('http://127.0.0.1:4000');
  FSync := TSyncService.Create(FAPI, DM.fdConCommand);
  
  // Log inicial para confirmar criação
  if Assigned(MemoLog) then
    Log('Sistema inicializado. Conectando em: http://127.0.0.1:4000 (Localhost)');
    
  // Marcar todas as entidades por padrão
  if Assigned(clbEntidades) then
    for var I := 0 to clbEntidades.Count - 1 do
      clbEntidades.Checked[I] := True;
end;

procedure TfrmMain.FormDestroy(Sender: TObject);
begin
  FSync.Free;
  FAPI.Free;
end;

procedure TfrmMain.Log(const AMsg: string);
begin
  MemoLog.Lines.Add(FormatDateTime('hh:nn:ss', Now) + ' - ' + AMsg);
end;

procedure TfrmMain.CarregarEmpresas;
var
  LQuery: TFDQuery;
begin
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := DM.fdConCommand;
    LQuery.SQL.Text := 'SELECT COD_EMP, RAZAO_EMP, FANTASIA_EMP FROM EMPRESA ORDER BY RAZAO_EMP';
    try
      LQuery.Open;
      clbEmpresas.Items.Clear;
      while not LQuery.Eof do
      begin
        // Formato: "COD_EMP - RAZAO_EMP (FANTASIA)"
        clbEmpresas.Items.AddObject(
          Format('%d - %s', [LQuery.FieldByName('COD_EMP').AsInteger, LQuery.FieldByName('RAZAO_EMP').AsString]),
          TObject(LQuery.FieldByName('COD_EMP').AsInteger)
        );
        LQuery.Next;
      end;
      if clbEmpresas.Items.Count > 0 then
      begin
        // Seleciona o primeiro item por padrão (opcional)
        // clbEmpresas.Checked[0] := True;
        Log(Format('Carregadas %d empresas.', [clbEmpresas.Items.Count]));
      end
      else
        Log('Nenhuma empresa encontrada no banco de dados.');
    except
      on E: Exception do
        Log('Erro ao carregar empresas: ' + E.Message);
    end;
  finally
    LQuery.Free;
  end;
end;

procedure TfrmMain.btnConnectDBClick(Sender: TObject);
begin
  try
    DM.fdConCommand.Connected := True;
    Log('Conectado ao Firebird com sucesso!');
    CarregarEmpresas;
  except
    on E: Exception do
      Log('Erro ao conectar Firebird: ' + E.Message);
  end;
end;

procedure TfrmMain.btnLoginAPIClick(Sender: TObject);
begin
  if FAPI.Login(edtEmail.Text, edtPass.Text) then
    Log('Login na API realizado! Token obtido.')
  else
  begin
    Log('Falha no login da API.');
    if FAPI.LastErrorMessage <> '' then
      Log('Detalhe do erro: ' + FAPI.LastErrorMessage);
  end;
end;

procedure TfrmMain.btnSyncClick(Sender: TObject);
var
  LCodEmp: Integer;
  I: Integer;
  LCount: Integer;
begin
  if not DM.fdConCommand.Connected then
  begin
    Log('Conecte no banco primeiro.');
    Exit;
  end;
  
  if FAPI.Token = '' then
  begin
    Log('Faça login na API primeiro.');
    Exit;
  end;
  
  LCount := 0;
  for I := 0 to clbEmpresas.Count - 1 do
    if clbEmpresas.Checked[I] then
      Inc(LCount);

  if LCount = 0 then
  begin
    Log('Selecione ao menos uma empresa para sincronizar.');
    Exit;
  end;
  
  Log(Format('Iniciando sincronização de %d empresa(s)...', [LCount]));
  
  try
    for I := 0 to clbEmpresas.Count - 1 do
    begin
      if clbEmpresas.Checked[I] then
      begin
        LCodEmp := Integer(clbEmpresas.Items.Objects[I]);
        Log(Format('Sincronizando Empresa Cód: %d...', [LCodEmp]));
        
        // Sincroniza a empresa primeiro (Índice 0)
        if clbEntidades.Checked[0] then
        begin
          if FSync.SyncCompany(LCodEmp) then
            Log('Empresa sincronizada com sucesso!')
          else
            Log('Erro ao sincronizar dados da empresa (Cadastro Principal): ' + FAPI.LastErrorMessage);
        end;

        // Contas Bancárias (Índice 1)
        if clbEntidades.Checked[1] then
        begin
          if FSync.SyncAccounts(LCodEmp) > 0 then
             Log('Contas Bancárias sincronizadas.');
        end;

        // Clientes (Índice 2)
        if clbEntidades.Checked[2] then
        begin
          if FSync.SyncCustomers(LCodEmp) > 0 then
             Log('Clientes sincronizados.');
        end;

        // Fornecedores (Índice 3)
        if clbEntidades.Checked[3] then
        begin
          // FSync.SyncSuppliers(LCodEmp);
        end;
        
        // Produtos (Índice 4)
        if clbEntidades.Checked[4] then
        begin
          // FSync.SyncProducts(LCodEmp);
        end;
        
        // Vendas (Índice 5)
        if clbEntidades.Checked[5] then
        begin
          // FSync.SyncSales(LCodEmp);
        end;
        
        // Contas a Pagar (Índice 6)
        if clbEntidades.Checked[6] then
        begin
          // FSync.SyncApTitles(LCodEmp);
        end;
        
        // Contas a Receber (Índice 7)
        if clbEntidades.Checked[7] then
        begin
          // FSync.SyncArTitles(LCodEmp);
        end;
          
        Application.ProcessMessages; // Mantém UI responsiva
      end;
    end;
     
    Log('Processo de sincronização finalizado.');
  except
    on E: Exception do
      Log('Erro fatal na sincronização: ' + E.Message);
  end;
end;

end.