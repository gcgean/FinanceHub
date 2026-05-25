object frmSyncSchedule: TfrmSyncSchedule
  Left = 0
  Top = 0
  Caption = 'Agendamento de Sincroniza'#231#227'o por Entidade'
  ClientHeight = 560
  ClientWidth = 760
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Segoe UI'
  Font.Style = []
  Position = poOwnerFormCenter
  OldCreateOrder = True
  OnCreate = FormCreate
  PixelsPerInch = 96
  TextHeight = 16
  object lvEntidades: TListView
    Left = 8
    Top = 8
    Width = 370
    Height = 544
    Anchors = [akLeft, akTop, akBottom]
    Columns = <
      item
        Caption = 'Entidade'
        Width = 178
      end
      item
        Caption = 'Status'
        Width = 58
      end
      item
        Caption = 'Intervalo'
        Width = 68
      end
      item
        Caption = #218'ltimos'
        Width = 58
      end>
    ReadOnly = True
    RowSelect = True
    TabOrder = 0
    ViewStyle = vsReport
    OnSelectItem = lvEntidadesSelectItem
  end
  object pnlDetail: TPanel
    Left = 386
    Top = 8
    Width = 366
    Height = 544
    Anchors = [akLeft, akTop, akRight, akBottom]
    BevelOuter = bvNone
    TabOrder = 1
    object lblEntityName: TLabel
      Left = 0
      Top = 0
      Width = 366
      Height = 26
      AutoSize = False
      Caption = '(selecione uma entidade na lista)'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -15
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
    end
    object chkEnabled: TCheckBox
      Left = 0
      Top = 40
      Width = 366
      Height = 22
      Caption = 'Ativo para sincroniza'#231#227'o autom'#225'tica'
      Enabled = False
      TabOrder = 0
      OnClick = chkEnabledClick
    end
    object grpDays: TGroupBox
      Left = 0
      Top = 76
      Width = 366
      Height = 66
      Caption = ' Per'#237'odo de dados '
      TabOrder = 1
      Visible = False
      object lblLastDays: TLabel
        Left = 12
        Top = 28
        Width = 118
        Height = 16
        Caption = 'Sincronizar '#250'ltimos:'
      end
      object spnLastDays: TSpinEdit
        Left = 136
        Top = 24
        Width = 72
        Height = 25
        MaxValue = 365
        MinValue = 1
        TabOrder = 0
        Value = 7
      end
      object lblDaysSuffix: TLabel
        Left = 216
        Top = 28
        Width = 100
        Height = 16
        Caption = 'dias (a partir de hoje)'
      end
    end
    object grpInterval: TGroupBox
      Left = 0
      Top = 82
      Width = 366
      Height = 62
      Caption = ' Intervalo de sincroniza'#231#227'o '
      TabOrder = 2
      object lblInterval: TLabel
        Left = 12
        Top = 26
        Width = 108
        Height = 16
        Caption = 'Sincronizar a cada:'
      end
      object cmbInterval: TComboBox
        Left = 128
        Top = 22
        Width = 224
        Height = 25
        Style = csDropDownList
        TabOrder = 0
      end
    end
    object lblLastSync: TLabel
      Left = 0
      Top = 154
      Width = 366
      Height = 18
      AutoSize = False
      Caption = #218'ltima sync: -'
    end
    object lblNextSync: TLabel
      Left = 0
      Top = 174
      Width = 366
      Height = 18
      AutoSize = False
      Caption = 'Pr'#243'xima sync: -'
    end
    object btnSalvar: TButton
      Left = 0
      Top = 206
      Width = 172
      Height = 30
      Caption = 'Salvar configura'#231#227'o'
      Enabled = False
      TabOrder = 3
      OnClick = btnSalvarClick
    end
    object btnFechar: TButton
      Left = 184
      Top = 206
      Width = 172
      Height = 30
      Caption = 'Fechar'
      TabOrder = 4
      OnClick = btnFecharClick
    end
    object lblHelp: TLabel
      Left = 0
      Top = 254
      Width = 366
      Height = 280
      AutoSize = False
      Caption =
        'Dica: configure o intervalo conforme a din'#226'mica de' + #13#10 +
        'cada grupo de registros.' + #13#10 +
        #13#10 +
        'Registros din'#226'micos (Vendas, T'#237'tulos, Lan'#231'amentos):' + #13#10 +
        '  Recomendado: 15 a 60 minutos' + #13#10 +
        #13#10 +
        'Cadastros atualizados frequentemente' + #13#10 +
        '(Clientes, Hist'#243'rico de desativa'#231#227'o):' + #13#10 +
        '  Recomendado: 1 a 4 horas' + #13#10 +
        #13#10 +
        'Tabelas est'#225'ticas (Produtos, Fornecedores,' + #13#10 +
        'Plano de Contas, Caixas, Vendedores):' + #13#10 +
        '  Recomendado: 24 horas' + #13#10 +
        #13#10 +
        'O auto-sync s'#243' roda enquanto o aplicativo' + #13#10 +
        'estiver aberto, conectado ao banco e' + #13#10 +
        'com login ativo na API.'
      WordWrap = True
    end
  end
end
