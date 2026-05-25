object frmConfig: TfrmConfig
  Left = 0
  Top = 0
  BorderStyle = bsDialog
  Caption = 'Configura'#231#245'es do Banco de Dados'
  ClientHeight = 280
  ClientWidth = 500
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Segoe UI'
  Font.Style = []
  OldCreateOrder = False
  Position = poOwnerFormCenter
  OnCreate = FormCreate
  TextHeight = 16
  object lblHost: TLabel
    Left = 16
    Top = 22
    Width = 26
    Height = 16
    Caption = 'Host:'
  end
  object lblPort: TLabel
    Left = 16
    Top = 58
    Width = 28
    Height = 16
    Caption = 'Porta:'
  end
  object lblUser: TLabel
    Left = 16
    Top = 94
    Width = 55
    Height = 16
    Caption = 'Usu'#225'rio:'
  end
  object lblPassword: TLabel
    Left = 16
    Top = 130
    Width = 32
    Height = 16
    Caption = 'Senha:'
  end
  object lblDatabase: TLabel
    Left = 16
    Top = 166
    Width = 34
    Height = 16
    Caption = 'Banco:'
  end
  object edtHost: TEdit
    Left = 120
    Top = 18
    Width = 364
    Height = 25
    Anchors = [akLeft, akTop, akRight]
    TabOrder = 0
  end
  object edtPort: TEdit
    Left = 120
    Top = 54
    Width = 80
    Height = 25
    TabOrder = 1
  end
  object edtUser: TEdit
    Left = 120
    Top = 90
    Width = 364
    Height = 25
    Anchors = [akLeft, akTop, akRight]
    TabOrder = 2
  end
  object edtPassword: TEdit
    Left = 120
    Top = 126
    Width = 364
    Height = 25
    Anchors = [akLeft, akTop, akRight]
    PasswordChar = '*'
    TabOrder = 3
  end
  object edtDatabase: TEdit
    Left = 120
    Top = 162
    Width = 328
    Height = 25
    Anchors = [akLeft, akTop, akRight]
    TabOrder = 4
  end
  object btnBrowse: TButton
    Left = 454
    Top = 162
    Width = 30
    Height = 25
    Caption = '...'
    Anchors = [akTop, akRight]
    TabOrder = 5
    OnClick = btnBrowseClick
  end
  object btnSalvar: TButton
    Left = 300
    Top = 234
    Width = 96
    Height = 30
    Caption = 'Salvar'
    Default = True
    TabOrder = 6
    OnClick = btnSalvarClick
  end
  object btnCancelar: TButton
    Left = 404
    Top = 234
    Width = 80
    Height = 30
    Caption = 'Cancelar'
    ModalResult = 2
    TabOrder = 7
  end
end
