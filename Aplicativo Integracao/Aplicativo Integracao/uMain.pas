unit uMain;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes,
  System.IniFiles, Vcl.Graphics, Vcl.Controls, Vcl.Forms, Vcl.Dialogs, Vcl.StdCtrls,
  Vcl.Menus, Vcl.ExtCtrls, uDM, uFinanceHubAPI, uSyncService, uFormConfig,
  uFormSyncSchedule, FireDAC.Comp.Client, Vcl.CheckLst, FireDAC.DApt, Vcl.ComCtrls;

type
  TfrmMain = class(TForm)
    btnConnectDB: TButton;
    btnLoginAPI: TButton;
    btnSync: TButton;
    btnMarcarTodos: TButton;
    btnDesmarcarTodos: TButton;
    btnConfigDB: TButton;
    btnAgendamento: TButton;
    btnConnectMySQL: TButton;
    btnSyncAnalytics: TButton;
    tmrAutoSync: TTimer;
    ProgressBar1: TProgressBar;
    lblProgress: TLabel;
    MemoLog: TMemo;
    edtEmail: TEdit;
    edtPass: TEdit;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    cbTitleDate: TComboBox;
    clbEmpresas: TCheckListBox;
    clbEntidades: TCheckListBox;
    dtpFrom: TDateTimePicker;
    dtpTo: TDateTimePicker;
    MainMenu1: TMainMenu;
    mnuConfig: TMenuItem;
    mnuConfigBanco: TMenuItem;
    mnuAgendamento: TMenuItem;
    mnuSep1: TMenuItem;
    mnuSair: TMenuItem;
    mnuAjuda: TMenuItem;
    mnuComoUsar: TMenuItem;
    procedure btnConnectDBClick(Sender: TObject);
    procedure btnLoginAPIClick(Sender: TObject);
    procedure btnSyncClick(Sender: TObject);
    procedure btnMarcarTodosClick(Sender: TObject);
    procedure btnDesmarcarTodosClick(Sender: TObject);
    procedure btnConfigDBClick(Sender: TObject);
    procedure btnAgendamentoClick(Sender: TObject);
    procedure btnConnectMySQLClick(Sender: TObject);
    procedure btnSyncAnalyticsClick(Sender: TObject);
    procedure tmrAutoSyncTimer(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure mnuConfigBancoClick(Sender: TObject);
    procedure mnuAgendamentoClick(Sender: TObject);
    procedure mnuSairClick(Sender: TObject);
    procedure mnuComoUsarClick(Sender: TObject);
  private
    FAPI: TFinanceHubAPI;
    FSync: TSyncService;
    FApiBaseUrl: string;
    FEntityConfigs: TEntitySyncConfigs;
    FIsSyncing: Boolean;
    procedure Log(const AMsg: string);
    procedure CarregarEmpresas;
    procedure SetProgress(const AMsg: string; ACurrent, ATotal: Integer);
    function IniFilePath: string;
    procedure LoadSettings;
    procedure SaveSettings;
    procedure SyncEntityAuto(AEntityIndex: Integer);
    procedure UpdateAutoSyncStatus;
  public
    { Public declarations }
  end;

var
  frmMain: TfrmMain;

implementation

{$R *.dfm}

function TfrmMain.IniFilePath: string;
begin
  Result := ExtractFilePath(Application.ExeName) + 'FinanceHubIntegrator.ini';
end;

procedure TfrmMain.LoadSettings;
var
  Ini: TIniFile;
  I: Integer;
begin
  if not FileExists(IniFilePath) then
    Exit;
  Ini := TIniFile.Create(IniFilePath);
  try
    edtEmail.Text := Ini.ReadString('Credentials', 'Email', edtEmail.Text);
    FApiBaseUrl := Ini.ReadString('API', 'BaseURL', FApiBaseUrl);
    for I := 0 to clbEntidades.Count - 1 do
      clbEntidades.Checked[I] := Ini.ReadBool('Entities', 'Entity_' + IntToStr(I), True);
  finally
    Ini.Free;
  end;
  // Carregar configurações de agendamento
  LoadSyncSchedule(FEntityConfigs);
end;

procedure TfrmMain.SaveSettings;
var
  Ini: TIniFile;
  I: Integer;
begin
  Ini := TIniFile.Create(IniFilePath);
  try
    Ini.WriteString('Credentials', 'Email', edtEmail.Text);
    if Trim(FApiBaseUrl) <> '' then
      Ini.WriteString('API', 'BaseURL', Trim(FApiBaseUrl));
    for I := 0 to clbEntidades.Count - 1 do
      Ini.WriteBool('Entities', 'Entity_' + IntToStr(I), clbEntidades.Checked[I]);
  finally
    Ini.Free;
  end;
  // Salvar configurações de agendamento
  SaveSyncSchedule(FEntityConfigs);
end;

procedure TfrmMain.FormCreate(Sender: TObject);
var
  I: Integer;
begin
  FApiBaseUrl := 'https://api.gestorfacil.ia.br';
  FIsSyncing  := False;
  LoadSettings;

  FAPI := TFinanceHubAPI.Create(FApiBaseUrl);
  FSync := TSyncService.Create(FAPI, DM.fdConCommand);
  FSync.OnLog := procedure(AMsg: string)
    begin
      Self.Log(AMsg);
    end;
  FSync.OnProgress := procedure(AMsg: string; ACurrent, ATotal: Integer)
    begin
      Self.SetProgress(AMsg, ACurrent, ATotal);
    end;

  if Assigned(MemoLog) then
    Log('Sistema inicializado. Conectando em: ' + FApiBaseUrl);

  // Defaults: marcar todas as entidades
  if Assigned(clbEntidades) then
    for I := 0 to clbEntidades.Count - 1 do
      clbEntidades.Checked[I] := True;

  if Assigned(dtpFrom) then
    dtpFrom.Date := Date - 7;
  if Assigned(dtpTo) then
    dtpTo.Date := Date;
  if Assigned(cbTitleDate) then
  begin
    cbTitleDate.Items.Clear;
    cbTitleDate.Items.Add('Emiss'#227'o');
    cbTitleDate.Items.Add('Vencimento');
    cbTitleDate.Items.Add('Pagamento');
    cbTitleDate.ItemIndex := 0;
  end;

  // Timer de auto-sync: verificar a cada 60 segundos
  tmrAutoSync.Interval := 60000;
  tmrAutoSync.Enabled  := True;
  UpdateAutoSyncStatus;
end;

procedure TfrmMain.FormDestroy(Sender: TObject);
begin
  SaveSettings;
  FSync.Free;
  FAPI.Free;
end;

procedure TfrmMain.btnMarcarTodosClick(Sender: TObject);
var
  I: Integer;
begin
  for I := 0 to clbEntidades.Count - 1 do
    clbEntidades.Checked[I] := True;
end;

procedure TfrmMain.btnDesmarcarTodosClick(Sender: TObject);
var
  I: Integer;
begin
  for I := 0 to clbEntidades.Count - 1 do
    clbEntidades.Checked[I] := False;
end;

procedure TfrmMain.Log(const AMsg: string);
begin
  MemoLog.Lines.Add(FormatDateTime('hh:nn:ss', Now) + ' - ' + AMsg);
  SendMessage(MemoLog.Handle, EM_SCROLL, SB_BOTTOM, 0);
end;

procedure TfrmMain.SetProgress(const AMsg: string; ACurrent, ATotal: Integer);
begin
  if Assigned(ProgressBar1) then
  begin
    if ATotal > 0 then
      ProgressBar1.Max := ATotal
    else
      ProgressBar1.Max := 1;

    if ACurrent < 0 then
      ProgressBar1.Position := 0
    else if ACurrent > ProgressBar1.Max then
      ProgressBar1.Position := ProgressBar1.Max
    else
      ProgressBar1.Position := ACurrent;
  end;

  if Assigned(lblProgress) then
  begin
    if ATotal > 0 then
      lblProgress.Caption := Format('%s (%d/%d)', [AMsg, ACurrent, ATotal])
    else
      lblProgress.Caption := AMsg;
  end;

  Application.ProcessMessages;
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
        clbEmpresas.Items.AddObject(
          Format('%d - %s', [LQuery.FieldByName('COD_EMP').AsInteger, LQuery.FieldByName('RAZAO_EMP').AsString]),
          TObject(LQuery.FieldByName('COD_EMP').AsInteger)
        );
        LQuery.Next;
      end;
      if clbEmpresas.Items.Count > 0 then
        Log(Format('Carregadas %d empresas.', [clbEmpresas.Items.Count]))
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
    DM.ConfigurarConexaoCommand;
    DM.fdConCommand.Connected := True;
    Log('Conectado ao Firebird com sucesso!');
    Application.ProcessMessages;
    CarregarEmpresas;
  except
    on E: Exception do
      Log('Erro ao conectar Firebird: ' + E.Message);
  end;
end;

procedure TfrmMain.btnConnectMySQLClick(Sender: TObject);
begin
  try
    DM.ConfigurarConexaoMySQL;
    DM.fdConMySQL.Connected := True;
    Log('Conectado ao MySQL Analytics com sucesso!');
  except
    on E: Exception do
      Log('Erro ao conectar MySQL Analytics: ' + E.Message);
  end;
end;

procedure TfrmMain.btnSyncAnalyticsClick(Sender: TObject);
var
  LCodEmp: Integer;
  I, LCount, LSynced: Integer;
begin
  if not DM.fdConMySQL.Connected then
  begin
    Log('Conecte ao MySQL Analytics primeiro (botão 4).');
    Exit;
  end;

  if not DM.fdConCommand.Connected then
  begin
    Log('Conecte ao banco Firebird primeiro (botão 1).');
    Exit;
  end;

  if FAPI.Token = '' then
  begin
    Log('Faça login na API primeiro (botão 2).');
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

  Log('Iniciando sincronização de atendimentos...');

  try
    for I := 0 to clbEmpresas.Count - 1 do
    begin
      if clbEmpresas.Checked[I] then
      begin
        LCodEmp := Integer(clbEmpresas.Items.Objects[I]);
        Log(Format('Sincronizando atendimentos para empresa cód: %d...', [LCodEmp]));
        LSynced := FSync.SyncAtendimentos(LCodEmp, DM.fdConMySQL, dtpFrom.Date, dtpTo.Date);
        if LSynced > 0 then
          Log(Format('Atendimentos sincronizados: %d', [LSynced]))
        else
          Log('Nenhum atendimento sincronizado.');
      end;
    end;
  except
    on E: Exception do
      Log('Erro fatal na sincronização de atendimentos: ' + E.Message);
  end;

  Log('Sincronização de atendimentos finalizada.');
end;

procedure TfrmMain.btnConfigDBClick(Sender: TObject);
var
  F: TfrmConfig;
begin
  F := TfrmConfig.Create(Self);
  try
    F.ShowModal;
  finally
    F.Free;
  end;
end;

procedure TfrmMain.mnuConfigBancoClick(Sender: TObject);
begin
  btnConfigDBClick(Sender);
end;

procedure TfrmMain.mnuAgendamentoClick(Sender: TObject);
begin
  btnAgendamentoClick(Sender);
end;

// ---------------------------------------------------------------------------
//  Agendamento automático
// ---------------------------------------------------------------------------

procedure TfrmMain.btnAgendamentoClick(Sender: TObject);
var
  F: TfrmSyncSchedule;
begin
  F := TfrmSyncSchedule.Create(Self);
  try
    F.SetConfigs(FEntityConfigs);
    if F.ShowModal = mrOk then
    begin
      F.GetConfigs(FEntityConfigs);
      SaveSyncSchedule(FEntityConfigs);
      UpdateAutoSyncStatus;
      Log('Configurações de agendamento salvas.');
    end;
  finally
    F.Free;
  end;
end;

procedure TfrmMain.UpdateAutoSyncStatus;
var
  I, LAtivos: Integer;
begin
  LAtivos := 0;
  for I := 0 to ENTITY_COUNT - 1 do
    if FEntityConfigs[I].Enabled then
      Inc(LAtivos);

  if LAtivos > 0 then
    btnAgendamento.Caption :=
      Format('Agendamento (%d ativos)', [LAtivos])
  else
    btnAgendamento.Caption := 'Agendamento';
end;

procedure TfrmMain.SyncEntityAuto(AEntityIndex: Integer);
var
  I, LCodEmp: Integer;
  LDateFrom, LDateTo: TDate;
  LCfg: TEntitySyncConfig;
begin
  LCfg := FEntityConfigs[AEntityIndex];

  // Calcular intervalo de datas para entidades com filtro
  if ENTITY_HAS_DATE[AEntityIndex] then
  begin
    LDateTo   := Date;
    LDateFrom := Date - LCfg.LastDays;
  end
  else
  begin
    LDateTo   := Date;
    LDateFrom := Date;
  end;

  for I := 0 to clbEmpresas.Count - 1 do
  begin
    if not clbEmpresas.Checked[I] then Continue;
    LCodEmp := Integer(clbEmpresas.Items.Objects[I]);

    // Garantir contexto de empresa (exceto para entidade 0 que faz isso via SyncCompany)
    if AEntityIndex > 0 then
      FSync.EnsureCompanyContext(LCodEmp);

    case AEntityIndex of
      0:  FSync.SyncCompany(LCodEmp);
      1:  FSync.SyncAccounts(LCodEmp);
      2:  FSync.SyncCustomers(LCodEmp);
      3:  FSync.SyncSuppliers(LCodEmp);
      4:  FSync.SyncProducts(LCodEmp);
      5:  FSync.SyncSales(LCodEmp, LDateFrom, LDateTo);
      6:  FSync.SyncApTitles(LCodEmp, LDateFrom, LDateTo, 0);
      7:  FSync.SyncArTitles(LCodEmp, LDateFrom, LDateTo, 0);
      8:  FSync.SyncCostCenters(LCodEmp);
      9:  FSync.SyncChartAccounts(LCodEmp);
      10: FSync.SyncCustomerDeactivationReasons(LCodEmp);
      11: FSync.SyncCustomerDeactivationHistory(LCodEmp);
      12: FSync.SyncCustomerClassifications(LCodEmp);
      13: FSync.SyncPaymentMethods(LCodEmp);
      14: FSync.SyncSellers(LCodEmp);
      15: FSync.SyncCashiers(LCodEmp);
      16:
        begin
          FSync.SyncLancamentos(LCodEmp);
          FSync.SyncLancamentosCentroCusto(LCodEmp);
        end;
      17:
        begin
          // Atendimentos requer MySQL conectado
          if DM.fdConMySQL.Connected then
            FSync.SyncAtendimentos(LCodEmp, DM.fdConMySQL, LDateFrom, LDateTo)
          else
            Log('[Auto] Atendimentos ignorados: MySQL desconectado.');
        end;
    end;
  end;

  // Registrar horário da última sincronização
  FEntityConfigs[AEntityIndex].LastSyncAt := Now;
  SaveSyncSchedule(FEntityConfigs);
end;

procedure TfrmMain.tmrAutoSyncTimer(Sender: TObject);
var
  I: Integer;
  LCfg: TEntitySyncConfig;
  LElapsedMin: Double;
  LHasCompany: Boolean;
begin
  // Pré-condições para qualquer auto-sync
  if FIsSyncing then Exit;
  if not DM.fdConCommand.Connected then Exit;
  if FAPI.Token = '' then Exit;

  // Verificar se há ao menos uma empresa selecionada
  LHasCompany := False;
  for I := 0 to clbEmpresas.Count - 1 do
    if clbEmpresas.Checked[I] then
    begin
      LHasCompany := True;
      Break;
    end;
  if not LHasCompany then Exit;

  FIsSyncing := True;
  try
    for I := 0 to ENTITY_COUNT - 1 do
    begin
      LCfg := FEntityConfigs[I];
      if not LCfg.Enabled then Continue;
      if LCfg.IntervalMinutes <= 0 then Continue;

      // Calcular minutos desde a última sync
      if LCfg.LastSyncAt <= 0 then
        LElapsedMin := LCfg.IntervalMinutes + 1  // Nunca sincronizou → forçar
      else
        LElapsedMin := (Now - LCfg.LastSyncAt) * 1440.0;

      if LElapsedMin >= LCfg.IntervalMinutes then
      begin
        Log(Format('[Auto] Iniciando: %s', [ENTITY_NAMES[I]]));
        try
          SyncEntityAuto(I);
          Log(Format('[Auto] OK: %s', [ENTITY_NAMES[I]]));
        except
          on E: Exception do
            Log(Format('[Auto] Erro em %s: %s', [ENTITY_NAMES[I], E.Message]));
        end;
        Application.ProcessMessages;
      end;
    end;
  finally
    FIsSyncing := False;
  end;
end;

procedure TfrmMain.mnuSairClick(Sender: TObject);
begin
  Close;
end;

procedure TfrmMain.mnuComoUsarClick(Sender: TObject);
begin
  ShowMessage(
    'Como usar o FinanceHub Integrador:' + #13#10 + #13#10 +
    '1. Config. Banco' + #13#10 +
    '   Clique em "Config. Banco" e preencha os dados' + #13#10 +
    '   de conexao (Host, Porta, Usuario, Senha, Banco).' + #13#10 +
    '   Clique Salvar - as configuracoes ficam gravadas' + #13#10 +
    '   no arquivo FinanceHubIntegrator.ini.' + #13#10 + #13#10 +
    '2. Conectar BD' + #13#10 +
    '   Conecta ao banco Firebird e carrega as empresas.' + #13#10 + #13#10 +
    '3. Login API' + #13#10 +
    '   Informe o e-mail e senha do FinanceHub e clique' + #13#10 +
    '   Login API para autenticar no servidor.' + #13#10 + #13#10 +
    '4. Sincronizar' + #13#10 +
    '   Selecione as entidades e empresas, defina o' + #13#10 +
    '   periodo e clique Sincronizar.'
  );
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
    Log('Fa'#231'a login na API primeiro.');
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

  Log(Format('Iniciando sincroniza'#231#227'o de %d empresa(s)...', [LCount]));

  try
    for I := 0 to clbEmpresas.Count - 1 do
    begin
      if clbEmpresas.Checked[I] then
      begin
        LCodEmp := Integer(clbEmpresas.Items.Objects[I]);
        Log(Format('Sincronizando Empresa C'#243'd: %d...', [LCodEmp]));

        if clbEntidades.Checked[0] then
        begin
          if FSync.SyncCompany(LCodEmp) then
            Log('Empresa sincronizada.')
          else
            Log('Erro ao sincronizar dados da empresa (Cadastro Principal): ' + FAPI.LastErrorMessage);
        end
        else
          FSync.EnsureCompanyContext(LCodEmp);

        Application.ProcessMessages;

        if clbEntidades.Checked[1] then
          if FSync.SyncAccounts(LCodEmp) > 0 then
            Log('Contas Banc'#225'rias sincronizadas.');

        if clbEntidades.Checked[2] then
          if FSync.SyncCustomers(LCodEmp) > 0 then
            Log('Clientes sincronizados.');

        if clbEntidades.Checked[3] then
          if FSync.SyncSuppliers(LCodEmp) > 0 then
            Log('Fornecedores sincronizados.');

        if clbEntidades.Checked[4] then
          if FSync.SyncProducts(LCodEmp) > 0 then
            Log('Cat'#225'logo de produtos sincronizado.');

        if clbEntidades.Checked[5] then
          if FSync.SyncSales(LCodEmp, dtpFrom.Date, dtpTo.Date) > 0 then
            Log('Vendas sincronizadas.');

        if clbEntidades.Checked[6] then
          if FSync.SyncApTitles(LCodEmp, dtpFrom.Date, dtpTo.Date, cbTitleDate.ItemIndex) > 0 then
            Log('Contas a pagar sincronizadas.');

        if clbEntidades.Checked[7] then
          if FSync.SyncArTitles(LCodEmp, dtpFrom.Date, dtpTo.Date, cbTitleDate.ItemIndex) > 0 then
            Log('Contas a receber sincronizadas.');

        if clbEntidades.Checked[8] then
          if FSync.SyncCostCenters(LCodEmp) > 0 then
            Log('Centros de Custo sincronizados.');

        if clbEntidades.Checked[9] then
          if FSync.SyncChartAccounts(LCodEmp) > 0 then
            Log('Plano de Contas sincronizado.');

        if clbEntidades.Checked[10] then
          if FSync.SyncCustomerDeactivationReasons(LCodEmp) > 0 then
            Log('Motivos de desativa'#231#227'o sincronizados.');

        if clbEntidades.Checked[11] then
          if FSync.SyncCustomerDeactivationHistory(LCodEmp) > 0 then
            Log('Hist'#243'rico de desativa'#231#227'o sincronizado.');

        if clbEntidades.Checked[12] then
          if FSync.SyncCustomerClassifications(LCodEmp) > 0 then
            Log('Classifica'#231#245'es de clientes sincronizadas.');

        if clbEntidades.Checked[13] then
          if FSync.SyncPaymentMethods(LCodEmp) > 0 then
            Log('Formas de pagamento sincronizadas.');

        if clbEntidades.Checked[14] then
          if FSync.SyncSellers(LCodEmp) > 0 then
            Log('Vendedores sincronizados.');

        if clbEntidades.Checked[15] then
          if FSync.SyncCashiers(LCodEmp) > 0 then
            Log('Caixas sincronizados.');

        if clbEntidades.Checked[16] then
        begin
          if FSync.SyncLancamentos(LCodEmp) > 0 then
            Log('Lan'#231'amentos conta corrente sincronizados.');
          // Migra o plano de contas dos lançamentos logo em seguida
          if FSync.SyncLancamentosCentroCusto(LCodEmp) > 0 then
            Log('Plano de contas dos lan'#231'amentos sincronizado.');
        end;

        Application.ProcessMessages;
      end;
    end;

    Log('Processo de sincroniza'#231#227'o finalizado.');
  except
    on E: Exception do
      Log('Erro fatal na sincroniza'#231#227'o: ' + E.Message);
  end;
end;

end.
