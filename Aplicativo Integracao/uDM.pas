unit uDM;

interface

uses
  System.SysUtils, System.Classes, System.IniFiles,
  FireDAC.Stan.Intf, FireDAC.Stan.Option,
  FireDAC.Stan.Error, FireDAC.UI.Intf, FireDAC.Phys.Intf, FireDAC.Stan.Def,
  FireDAC.Stan.Pool, FireDAC.Stan.Async, FireDAC.Phys, FireDAC.Phys.FB,
  FireDAC.Phys.FBDef, FireDAC.VCLUI.Wait, FireDAC.Comp.Client, Data.DB,
  FireDAC.Comp.UI, FireDAC.Phys.IBBase, FireDAC.Phys.MySQL, FireDAC.Phys.MySQLDef,
  REST.Types, REST.Client,
  Data.Bind.Components, Data.Bind.ObjectScope;

type
  TDM = class(TDataModule)
    fdConCommand: TFDConnection;
    fdPhysFBDriverLink1: TFDPhysFBDriverLink;
    fdGUIxWaitCursor1: TFDGUIxWaitCursor;
    fdConMySQL: TFDConnection;
    fdPhysMySQLDriverLink1: TFDPhysMySQLDriverLink;
    RESTClient1: TRESTClient;
    RESTRequest1: TRESTRequest;
    RESTResponse1: TRESTResponse;
    procedure DataModuleCreate(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
    procedure ConfigurarConexaoCommand;
    procedure ConfigurarConexaoMySQL;
    procedure ConfigurarAPI(const ABaseURL: string);
  end;

var
  DM: TDM;

implementation

{%CLASSGROUP 'Vcl.Controls.TControl'}

{$R *.dfm}

procedure TDM.DataModuleCreate(Sender: TObject);
begin
  ConfigurarConexaoCommand;
end;

procedure TDM.ConfigurarConexaoCommand;
var
  Ini: TIniFile;
  LHost, LPort, LUser, LPassword, LDatabase: string;
begin
  Ini := TIniFile.Create(ChangeFileExt(ParamStr(0), '.ini'));
  try
    LHost     := Ini.ReadString('Database', 'Host',     '26.241.132.21');
    LPort     := Ini.ReadString('Database', 'Port',     '3050');
    LUser     := Ini.ReadString('Database', 'User',     'SYSDBA');
    LPassword := Ini.ReadString('Database', 'Password', 'csqwe123');
    LDatabase := Ini.ReadString('Database', 'Database',
      'C:\Windows\DataCloud\Connection - Command System\data\data.fdb');
  finally
    Ini.Free;
  end;

  fdConCommand.Connected := False;
  fdConCommand.Params.Clear;
  fdConCommand.Params.DriverID := 'FB';
  fdConCommand.Params.Add('Server=' + LHost);
  if LPort <> '' then
    fdConCommand.Params.Add('Port=' + LPort);
  fdConCommand.Params.Add('Database=' + LDatabase);
  fdConCommand.Params.Add('User_Name=' + LUser);
  fdConCommand.Params.Add('Password=' + LPassword);
  fdConCommand.Params.Add('Protocol=TCPIP');
  fdConCommand.Params.Add('CharacterSet=WIN1252');
end;

procedure TDM.ConfigurarConexaoMySQL;
begin
  fdConMySQL.Connected := False;
  fdConMySQL.Params.Clear;
  fdConMySQL.Params.DriverID := 'MySQL';
  fdConMySQL.Params.Add('Server=analitcs.ciloscloud.com.br');
  fdConMySQL.Params.Add('Port=3306');
  fdConMySQL.Params.Add('Database=suporte');
  fdConMySQL.Params.Add('User_Name=root');
  fdConMySQL.Params.Add('Password=SDGdfa45342');
  fdConMySQL.Params.Add('CharacterSet=utf8');
  fdConMySQL.LoginPrompt := False;
end;

procedure TDM.ConfigurarAPI(const ABaseURL: string);
begin
  RESTClient1.BaseURL := ABaseURL;
  RESTClient1.ContentType := 'application/json';
end;

end.