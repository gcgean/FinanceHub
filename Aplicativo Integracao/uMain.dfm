object frmMain: TfrmMain
  Left = 0
  Top = 0
  Caption = 'FinanceHub Integrator - Command System'
  ClientHeight = 442
  ClientWidth = 628
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -12
  Font.Name = 'Segoe UI'
  Font.Style = []
  OldCreateOrder = True
  OnCreate = FormCreate
  OnDestroy = FormDestroy
  PixelsPerInch = 96
  TextHeight = 15
  object clbEntidades: TCheckListBox
    Left = 24
    Top = 50
    Width = 273
    Height = 105
    ItemHeight = 15
    Items.Strings = (
      '1. Empresa (Cadastro)'
      '2. Contas Bancárias'
      '3. Clientes'
      '4. Fornecedores'
      '5. Produtos'
      '6. Vendas'
      '7. Contas a Pagar'
      '8. Contas a Receber')
    TabOrder = 7
  end
  object Label4: TLabel
    Left = 24
    Top = 35
    Width = 100
    Height = 15
    Caption = 'O que sincronizar?'
  end
  object Label1: TLabel
    Left = 24
    Top = 8
    Width = 32
    Height = 15
    Caption = 'Email:'
  end
  object Label2: TLabel
    Left = 312
    Top = 8
    Width = 35
    Height = 15
    Caption = 'Senha:'
  end
  object Label3: TLabel
    Left = 312
    Top = 35
    Width = 47
    Height = 15
    Caption = 'Empresas:'
  end
  object edtEmail: TEdit
    Left = 80
    Top = 5
    Width = 217
    Height = 23
    TabOrder = 4
    Text = 'admin@financehub.local'
  end
  object edtPass: TEdit
    Left = 353
    Top = 5
    Width = 248
    Height = 23
    PasswordChar = '*'
    TabOrder = 5
    Text = 'admin123'
  end
  object clbEmpresas: TCheckListBox
    Left = 312
    Top = 50
    Width = 289
    Height = 97
    ItemHeight = 15
    TabOrder = 6
  end
  object btnConnectDB: TButton
    Left = 24
    Top = 168
    Width = 129
    Height = 25
    Caption = '1. Conectar BD'
    TabOrder = 0
    OnClick = btnConnectDBClick
  end
  object btnLoginAPI: TButton
    Left = 168
    Top = 168
    Width = 129
    Height = 25
    Caption = '2. Login API'
    TabOrder = 1
    OnClick = btnLoginAPIClick
  end
  object btnSync: TButton
    Left = 312
    Top = 168
    Width = 129
    Height = 25
    Caption = '3. Sincronizar'
    TabOrder = 2
    OnClick = btnSyncClick
  end
  object MemoLog: TMemo
    Left = 24
    Top = 208
    Width = 577
    Height = 217
    Lines.Strings = (
      'Logs do sistema...')
    ScrollBars = ssVertical
    TabOrder = 3
  end
end
