unit uFormSyncSchedule;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants,
  System.Classes, Vcl.Graphics, Vcl.Controls, Vcl.Forms, Vcl.Dialogs,
  Vcl.StdCtrls, Vcl.ComCtrls, Vcl.Samples.Spin, Vcl.ExtCtrls, System.IniFiles;

const
  ENTITY_COUNT = 18;

  ENTITY_NAMES: array[0..ENTITY_COUNT - 1] of string = (
    'Empresa (Cadastro Principal)',
    'Contas Banc'#225'rias',
    'Clientes',
    'Fornecedores',
    'Cat'#225'logo de Produtos',
    'Vendas',
    'Contas a Pagar',
    'Contas a Receber',
    'Centro de Custos',
    'Plano de Contas',
    'Motivos de Desativa'#231#227'o',
    'Hist'#243'rico de Desativa'#231#227'o',
    'Classifica'#231#245'es de Clientes',
    'Formas de Pagamento',
    'Vendedores',
    'Caixas',
    'Lan'#231'amentos Conta Corrente',
    'Atendimentos (Analytics)'
  );

  // Quais entidades aceitam filtro por intervalo de datas
  ENTITY_HAS_DATE: array[0..ENTITY_COUNT - 1] of Boolean = (
    False, False, False, False, False,  // 0-4
    True,  True,  True,                 // 5-7: Vendas, C.Pagar, C.Receber
    False, False, False, False, False, False, False, False, False, // 8-16
    True                                // 17: Atendimentos
  );

  // Padrão: quantos dias atrás sincronizar (0 = não aplicável)
  ENTITY_DEFAULT_LASTDAYS: array[0..ENTITY_COUNT - 1] of Integer = (
    0,  0,  0,  0,  0,   // 0-4
    7,  30, 30,          // 5-7
    0,  0,  0,  0,  0,  0,  0,  0,  0, // 8-16
    30                   // 17
  );

  // Padrão: intervalo em minutos
  ENTITY_DEFAULT_INTERVAL: array[0..ENTITY_COUNT - 1] of Integer = (
    1440, 1440, 60,   1440, 1440,  // 0-4
    30,   60,   60,                // 5-7
    1440, 1440, 1440, 60,  1440, 1440, 1440, 1440, 60, // 8-16
    60                             // 17
  );

  // Opções do ComboBox de intervalo (minutos)
  INTERVAL_MINUTES: array[0..9] of Integer =
    (5, 10, 15, 30, 60, 120, 240, 360, 720, 1440);

  INTERVAL_LABELS: array[0..9] of string = (
    '5 minutos', '10 minutos', '15 minutos', '30 minutos',
    '1 hora', '2 horas', '4 horas', '6 horas', '12 horas', '24 horas (di'#225'rio)'
  );

type
  TEntitySyncConfig = record
    Enabled: Boolean;
    LastDays: Integer;         // Quantos dias atrás sincronizar (para entidades com data)
    IntervalMinutes: Integer;  // Intervalo de sincronização em minutos
    LastSyncAt: TDateTime;     // Última sincronização (0 = nunca)
  end;

  TEntitySyncConfigs = array[0..ENTITY_COUNT - 1] of TEntitySyncConfig;

// Funções globais de persistência
procedure LoadSyncSchedule(out AConfigs: TEntitySyncConfigs);
procedure SaveSyncSchedule(const AConfigs: TEntitySyncConfigs);
function IntervalToStr(AMinutes: Integer): string;

type
  TfrmSyncSchedule = class(TForm)
    lvEntidades: TListView;
    pnlDetail: TPanel;
    lblEntityName: TLabel;
    chkEnabled: TCheckBox;
    grpDays: TGroupBox;
    lblLastDays: TLabel;
    spnLastDays: TSpinEdit;
    lblDaysSuffix: TLabel;
    grpInterval: TGroupBox;
    lblInterval: TLabel;
    cmbInterval: TComboBox;
    lblLastSync: TLabel;
    lblNextSync: TLabel;
    btnSalvar: TButton;
    btnFechar: TButton;
    lblHelp: TLabel;
    procedure FormCreate(Sender: TObject);
    procedure lvEntidadesSelectItem(Sender: TObject; Item: TListItem;
      Selected: Boolean);
    procedure btnSalvarClick(Sender: TObject);
    procedure btnFecharClick(Sender: TObject);
    procedure chkEnabledClick(Sender: TObject);
  private
    FConfigs: TEntitySyncConfigs;
    FCurrentIndex: Integer;
    FUpdating: Boolean;
    procedure PopulateList;
    procedure ShowEntityConfig(AIndex: Integer);
    procedure SaveCurrentEntityConfig;
    procedure UpdateListItem(AIndex: Integer);
    function IntervalMinutesToIndex(AMinutes: Integer): Integer;
    procedure UpdateDetailEnabled;
    procedure RefreshNextSyncLabel;
  public
    procedure SetConfigs(const AConfigs: TEntitySyncConfigs);
    procedure GetConfigs(out AConfigs: TEntitySyncConfigs);
  end;

var
  frmSyncSchedule: TfrmSyncSchedule;

implementation

{$R *.dfm}

// ---------------------------------------------------------------------------
//  Funções globais
// ---------------------------------------------------------------------------

function SyncIniPath: string;
begin
  Result := ChangeFileExt(ParamStr(0), '.ini');
end;

procedure LoadSyncSchedule(out AConfigs: TEntitySyncConfigs);
var
  Ini: TIniFile;
  I: Integer;
  LDateStr: string;
begin
  // Defaults
  for I := 0 to ENTITY_COUNT - 1 do
  begin
    AConfigs[I].Enabled        := False;
    AConfigs[I].LastDays       := ENTITY_DEFAULT_LASTDAYS[I];
    AConfigs[I].IntervalMinutes := ENTITY_DEFAULT_INTERVAL[I];
    AConfigs[I].LastSyncAt     := 0;
  end;

  if not FileExists(SyncIniPath) then Exit;

  Ini := TIniFile.Create(SyncIniPath);
  try
    for I := 0 to ENTITY_COUNT - 1 do
    begin
      AConfigs[I].Enabled :=
        Ini.ReadBool('SyncSchedule', Format('Entity_%d_Enabled', [I]), False);
      AConfigs[I].LastDays :=
        Ini.ReadInteger('SyncSchedule', Format('Entity_%d_LastDays', [I]),
          ENTITY_DEFAULT_LASTDAYS[I]);
      AConfigs[I].IntervalMinutes :=
        Ini.ReadInteger('SyncSchedule', Format('Entity_%d_IntervalMin', [I]),
          ENTITY_DEFAULT_INTERVAL[I]);

      LDateStr := Ini.ReadString('SyncSchedule',
        Format('Entity_%d_LastSync', [I]), '');
      if LDateStr <> '' then
        try
          AConfigs[I].LastSyncAt := StrToDateTime(LDateStr);
        except
          AConfigs[I].LastSyncAt := 0;
        end;
    end;
  finally
    Ini.Free;
  end;
end;

procedure SaveSyncSchedule(const AConfigs: TEntitySyncConfigs);
var
  Ini: TIniFile;
  I: Integer;
begin
  Ini := TIniFile.Create(SyncIniPath);
  try
    for I := 0 to ENTITY_COUNT - 1 do
    begin
      Ini.WriteBool('SyncSchedule',
        Format('Entity_%d_Enabled', [I]), AConfigs[I].Enabled);
      Ini.WriteInteger('SyncSchedule',
        Format('Entity_%d_LastDays', [I]), AConfigs[I].LastDays);
      Ini.WriteInteger('SyncSchedule',
        Format('Entity_%d_IntervalMin', [I]), AConfigs[I].IntervalMinutes);

      if AConfigs[I].LastSyncAt > 0 then
        Ini.WriteString('SyncSchedule',
          Format('Entity_%d_LastSync', [I]),
          FormatDateTime('yyyy-mm-dd hh:nn:ss', AConfigs[I].LastSyncAt))
      else
        Ini.WriteString('SyncSchedule',
          Format('Entity_%d_LastSync', [I]), '');
    end;
  finally
    Ini.Free;
  end;
end;

function IntervalToStr(AMinutes: Integer): string;
var
  I: Integer;
begin
  for I := 0 to High(INTERVAL_MINUTES) do
    if INTERVAL_MINUTES[I] = AMinutes then
    begin
      Result := INTERVAL_LABELS[I];
      Exit;
    end;
  // Valor fora da lista padrão
  if AMinutes < 60 then
    Result := Format('%d min', [AMinutes])
  else if (AMinutes mod 60) = 0 then
    Result := Format('%dh', [AMinutes div 60])
  else
    Result := Format('%d min', [AMinutes]);
end;

// ---------------------------------------------------------------------------
//  TfrmSyncSchedule
// ---------------------------------------------------------------------------

procedure TfrmSyncSchedule.FormCreate(Sender: TObject);
var
  I: Integer;
begin
  FCurrentIndex := -1;
  FUpdating     := False;

  // Popular ComboBox de intervalos
  cmbInterval.Items.Clear;
  for I := 0 to High(INTERVAL_LABELS) do
    cmbInterval.Items.Add(INTERVAL_LABELS[I]);
  cmbInterval.ItemIndex := 3; // padrão: 30 min

  LoadSyncSchedule(FConfigs);
  PopulateList;
  UpdateDetailEnabled;
end;

procedure TfrmSyncSchedule.SetConfigs(const AConfigs: TEntitySyncConfigs);
begin
  FConfigs := AConfigs;
  PopulateList;
end;

procedure TfrmSyncSchedule.GetConfigs(out AConfigs: TEntitySyncConfigs);
begin
  AConfigs := FConfigs;
end;

procedure TfrmSyncSchedule.PopulateList;
var
  I: Integer;
  LItem: TListItem;
begin
  lvEntidades.Items.BeginUpdate;
  try
    lvEntidades.Items.Clear;
    for I := 0 to ENTITY_COUNT - 1 do
    begin
      LItem := lvEntidades.Items.Add;
      LItem.Caption := ENTITY_NAMES[I];
      LItem.Data    := Pointer(I);
      LItem.SubItems.Add(''); // Status
      LItem.SubItems.Add(''); // Intervalo
      LItem.SubItems.Add(''); // Últimos X dias
      UpdateListItem(I);
    end;
  finally
    lvEntidades.Items.EndUpdate;
  end;
end;

procedure TfrmSyncSchedule.UpdateListItem(AIndex: Integer);
var
  LItem: TListItem;
  LCfg: TEntitySyncConfig;
begin
  if (AIndex < 0) or (AIndex >= lvEntidades.Items.Count) then Exit;
  LItem := lvEntidades.Items[AIndex];
  LCfg  := FConfigs[AIndex];

  if LCfg.Enabled then
  begin
    LItem.SubItems[0] := 'ATIVO';
    LItem.SubItems[1] := IntervalToStr(LCfg.IntervalMinutes);
    if ENTITY_HAS_DATE[AIndex] then
      LItem.SubItems[2] := Format('%d dias', [LCfg.LastDays])
    else
      LItem.SubItems[2] := '-';
  end
  else
  begin
    LItem.SubItems[0] := 'Inativo';
    LItem.SubItems[1] := '-';
    LItem.SubItems[2] := '-';
  end;
end;

procedure TfrmSyncSchedule.lvEntidadesSelectItem(Sender: TObject;
  Item: TListItem; Selected: Boolean);
begin
  if not Selected or (Item = nil) then Exit;
  ShowEntityConfig(Integer(Item.Data));
end;

procedure TfrmSyncSchedule.ShowEntityConfig(AIndex: Integer);
var
  LCfg: TEntitySyncConfig;
  LIntervalTop: Integer;
begin
  if (AIndex < 0) or (AIndex >= ENTITY_COUNT) then Exit;

  FUpdating := True;
  try
    FCurrentIndex := AIndex;
    LCfg := FConfigs[AIndex];

    lblEntityName.Caption := ENTITY_NAMES[AIndex];
    chkEnabled.Checked    := LCfg.Enabled;

    // Mostrar/ocultar grupo de período de dados
    grpDays.Visible := ENTITY_HAS_DATE[AIndex];

    // Reposicionar grpInterval conforme visibilidade do grpDays
    if ENTITY_HAS_DATE[AIndex] then
      LIntervalTop := 158
    else
      LIntervalTop := 82;

    grpInterval.Top  := LIntervalTop;
    lblLastSync.Top  := LIntervalTop + 72;
    lblNextSync.Top  := LIntervalTop + 92;
    btnSalvar.Top    := LIntervalTop + 124;
    btnFechar.Top    := LIntervalTop + 124;
    lblHelp.Top      := LIntervalTop + 172;

    // Preencher período de dados (só para entidades com filtro de data)
    if ENTITY_HAS_DATE[AIndex] then
    begin
      spnLastDays.Value := LCfg.LastDays;
      if spnLastDays.Value <= 0 then
        spnLastDays.Value := ENTITY_DEFAULT_LASTDAYS[AIndex];
      if spnLastDays.Value <= 0 then
        spnLastDays.Value := 7;
    end;

    // Intervalo
    cmbInterval.ItemIndex := IntervalMinutesToIndex(LCfg.IntervalMinutes);

    // Labels de sync
    if LCfg.LastSyncAt > 0 then
      lblLastSync.Caption :=
        'Última sync: ' + FormatDateTime('dd/mm/yyyy hh:nn', LCfg.LastSyncAt)
    else
      lblLastSync.Caption := 'Última sync: nunca realizada';

    RefreshNextSyncLabel;
    UpdateDetailEnabled;
  finally
    FUpdating := False;
  end;
end;

procedure TfrmSyncSchedule.RefreshNextSyncLabel;
var
  LCfg: TEntitySyncConfig;
  LNext: TDateTime;
begin
  if FCurrentIndex < 0 then Exit;
  LCfg := FConfigs[FCurrentIndex];

  if LCfg.Enabled then
  begin
    if LCfg.LastSyncAt > 0 then
    begin
      LNext := LCfg.LastSyncAt + LCfg.IntervalMinutes / 1440.0;
      if LNext < Now then
        lblNextSync.Caption := 'Próxima sync: na próxima verificação'
      else
        lblNextSync.Caption :=
          'Próxima sync: ' + FormatDateTime('dd/mm/yyyy hh:nn', LNext);
    end
    else
      lblNextSync.Caption := 'Próxima sync: na próxima verificação';
  end
  else
    lblNextSync.Caption := 'Próxima sync: -';
end;

procedure TfrmSyncSchedule.UpdateDetailEnabled;
var
  LHas, LOn: Boolean;
begin
  LHas := FCurrentIndex >= 0;
  LOn  := LHas and chkEnabled.Checked;

  chkEnabled.Enabled  := LHas;
  grpDays.Enabled     := LOn;
  grpInterval.Enabled := LOn;
  spnLastDays.Enabled := LOn;
  cmbInterval.Enabled := LOn;
  btnSalvar.Enabled   := LHas;
end;

procedure TfrmSyncSchedule.chkEnabledClick(Sender: TObject);
begin
  if FUpdating then Exit;
  UpdateDetailEnabled;
  RefreshNextSyncLabel;
end;

procedure TfrmSyncSchedule.SaveCurrentEntityConfig;
var
  LIdx: Integer;
begin
  LIdx := FCurrentIndex;
  if (LIdx < 0) or (LIdx >= ENTITY_COUNT) then Exit;

  FConfigs[LIdx].Enabled := chkEnabled.Checked;

  if ENTITY_HAS_DATE[LIdx] and (spnLastDays.Value > 0) then
    FConfigs[LIdx].LastDays := spnLastDays.Value;

  if (cmbInterval.ItemIndex >= 0) and
     (cmbInterval.ItemIndex <= High(INTERVAL_MINUTES)) then
    FConfigs[LIdx].IntervalMinutes := INTERVAL_MINUTES[cmbInterval.ItemIndex];

  UpdateListItem(LIdx);
end;

function TfrmSyncSchedule.IntervalMinutesToIndex(AMinutes: Integer): Integer;
var
  I, LBestIdx, LBestDiff: Integer;
begin
  LBestIdx  := 0;
  LBestDiff := MaxInt;
  for I := 0 to High(INTERVAL_MINUTES) do
    if Abs(INTERVAL_MINUTES[I] - AMinutes) < LBestDiff then
    begin
      LBestDiff := Abs(INTERVAL_MINUTES[I] - AMinutes);
      LBestIdx  := I;
    end;
  Result := LBestIdx;
end;

procedure TfrmSyncSchedule.btnSalvarClick(Sender: TObject);
begin
  if FCurrentIndex < 0 then Exit;
  SaveCurrentEntityConfig;
  SaveSyncSchedule(FConfigs);
  ShowEntityConfig(FCurrentIndex); // atualiza labels
  ShowMessage('Configuração salva!');
end;

procedure TfrmSyncSchedule.btnFecharClick(Sender: TObject);
begin
  if FCurrentIndex >= 0 then
    SaveCurrentEntityConfig;
  SaveSyncSchedule(FConfigs);
  ModalResult := mrOk;
end;

end.
