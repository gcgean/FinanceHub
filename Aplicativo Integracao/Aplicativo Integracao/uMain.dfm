object frmMain: TfrmMain
  Left = 0
  Top = 0
  Caption = 'FinanceHub Integrator - Command System'
  ClientHeight = 680
  ClientWidth = 820
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Segoe UI'
  Font.Style = []
  OldCreateOrder = True
  Position = poScreenCenter
  OnCreate = FormCreate
  OnDestroy = FormDestroy
  PixelsPerInch = 96
  TextHeight = 16
  object Label1: TLabel
    Left = 16
    Top = 14
    Width = 36
    Height = 16
    Caption = 'Email:'
  end
  object Label2: TLabel
    Left = 376
    Top = 14
    Width = 38
    Height = 16
    Caption = 'Senha:'
  end
  object Label4: TLabel
    Left = 16
    Top = 46
    Width = 107
    Height = 16
    Caption = 'O que sincronizar?'
  end
  object Label3: TLabel
    Left = 432
    Top = 46
    Width = 57
    Height = 16
    Caption = 'Empresas:'
  end
  object Label5: TLabel
    Left = 16
    Top = 438
    Width = 65
    Height = 16
    Caption = 'Data inicial:'
  end
  object Label6: TLabel
    Left = 222
    Top = 438
    Width = 57
    Height = 16
    Caption = 'Data final:'
  end
  object Label7: TLabel
    Left = 428
    Top = 438
    Width = 85
    Height = 16
    Caption = 'Filtrar por data:'
  end
  object lblProgress: TLabel
    Left = 16
    Top = 515
    Width = 42
    Height = 16
    Anchors = [akLeft, akBottom]
    Caption = 'Pronto.'
  end
  object edtEmail: TEdit
    Left = 60
    Top = 10
    Width = 300
    Height = 25
    TabOrder = 4
    Text = 'admin@financehub.local'
  end
  object edtPass: TEdit
    Left = 422
    Top = 10
    Width = 382
    Height = 25
    Anchors = [akLeft, akTop, akRight]
    PasswordChar = '*'
    TabOrder = 5
    Text = 'admin123'
  end
  object clbEntidades: TCheckListBox
    Left = 16
    Top = 64
    Width = 400
    Height = 290
    ItemHeight = 18
    Items.Strings = (
      '1. Empresa (Cadastro)'
      '2. Contas Banc'#195#161'rias'
      '3. Clientes'
      '4. Fornecedores'
      '5. Produtos'
      '6. Vendas'
      '7. Contas a Pagar'
      '8. Contas a Receber'
      '9. Centro de Custos'
      '10. Plano de Contas'
      '11. Motivos de desativa'#195#167#195#163'o'
      '12. Hist'#195#179'rico de desativa'#195#167#195#163'o'
      '13. Classifica'#195#167#195#181'es de clientes'
      '14. Formas de Pagamento'
      '15. Vendedores'
      '16. Caixas')
    TabOrder = 7
  end
  object clbEmpresas: TCheckListBox
    Left = 432
    Top = 64
    Width = 372
    Height = 290
    Anchors = [akLeft, akTop, akRight]
    ItemHeight = 18
    TabOrder = 6
  end
  object btnMarcarTodos: TButton
    Left = 16
    Top = 362
    Width = 130
    Height = 26
    Caption = 'Marcar Todos'
    TabOrder = 12
    OnClick = btnMarcarTodosClick
  end
  object btnDesmarcarTodos: TButton
    Left = 154
    Top = 362
    Width = 150
    Height = 26
    Caption = 'Desmarcar Todos'
    TabOrder = 13
    OnClick = btnDesmarcarTodosClick
  end
  object btnConnectDB: TButton
    Left = 16
    Top = 398
    Width = 145
    Height = 28
    Caption = '1. Conectar BD'
    TabOrder = 0
    OnClick = btnConnectDBClick
  end
  object btnLoginAPI: TButton
    Left = 172
    Top = 398
    Width = 145
    Height = 28
    Caption = '2. Login API'
    TabOrder = 1
    OnClick = btnLoginAPIClick
  end
  object btnSync: TButton
    Left = 328
    Top = 398
    Width = 145
    Height = 28
    Caption = '3. Sincronizar'
    TabOrder = 2
    OnClick = btnSyncClick
  end
  object dtpFrom: TDateTimePicker
    Left = 16
    Top = 456
    Width = 190
    Height = 25
    Date = 45290.000000000000000000
    Time = 45290.000000000000000000
    ShowCheckbox = True
    Checked = False
    TabOrder = 9
  end
  object dtpTo: TDateTimePicker
    Left = 222
    Top = 456
    Width = 190
    Height = 25
    Date = 45290.000000000000000000
    Time = 45290.000000000000000000
    ShowCheckbox = True
    Checked = False
    TabOrder = 10
  end
  object cbTitleDate: TComboBox
    Left = 428
    Top = 456
    Width = 250
    Height = 25
    Style = csDropDownList
    TabOrder = 11
  end
  object ProgressBar1: TProgressBar
    Left = 16
    Top = 492
    Width = 788
    Height = 20
    Anchors = [akLeft, akRight, akBottom]
    TabOrder = 8
  end
  object MemoLog: TMemo
    Left = 16
    Top = 534
    Width = 788
    Height = 130
    Anchors = [akLeft, akTop, akRight, akBottom]
    Lines.Strings = (
      'Logs do sistema...')
    ScrollBars = ssVertical
    TabOrder = 3
  end
end
