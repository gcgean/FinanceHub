object DM: TDM
  OldCreateOrder = True
  OnCreate = DataModuleCreate
  Height = 267
  Width = 403
  object fdConCommand: TFDConnection
    Params.Strings = (
      'DriverID=FB'
      'User_Name=sysdba'
      'Password=masterkey')
    LoginPrompt = False
    Left = 48
    Top = 32
  end
  object fdPhysFBDriverLink1: TFDPhysFBDriverLink
    Left = 48
    Top = 96
  end
  object fdGUIxWaitCursor1: TFDGUIxWaitCursor
    Provider = 'Forms'
    Left = 48
    Top = 160
  end
  object RESTClient1: TRESTClient
    Params = <>
    SynchronizedEvents = False
    Left = 200
    Top = 32
  end
  object RESTRequest1: TRESTRequest
    Client = RESTClient1
    Response = RESTResponse1
    Params = <>
    SynchronizedEvents = False
    Left = 200
    Top = 96
  end
  object RESTResponse1: TRESTResponse
    Left = 200
    Top = 160
  end
end
