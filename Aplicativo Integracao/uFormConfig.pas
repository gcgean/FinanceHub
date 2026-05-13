unit uFormConfig;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants,
  System.Classes, Vcl.Graphics, Vcl.Controls, Vcl.Forms, Vcl.Dialogs,
  Vcl.StdCtrls, System.IniFiles;

const
  DB_DEFAULT_HOST     = 'commandsystem.commandcloud.com.br';
  DB_DEFAULT_PORT     = '3050';
  DB_DEFAULT_USER     = 'SYSDBA';
  DB_DEFAULT_PASSWORD = 'csqwe123';
  DB_DEFAULT_DATABASE = 'C:\Windows\DataCloud\Connection - Command System\data\data.fdb';
  INI_SECTION_DB      = 'Database';

type
  TfrmConfig = class(TForm)
    lblHost: TLabel;
    lblPort: TLabel;
    lblUser: TLabel;
    lblPassword: TLabel;
    lblDatabase: TLabel;
    edtHost: TEdit;
    edtPort: TEdit;
    edtUser: TEdit;
    edtPassword: TEdit;
    edtDatabase: TEdit;
    btnBrowse: TButton;
    btnSalvar: TButton;
    btnCancelar: TButton;
    procedure FormCreate(Sender: TObject);
    procedure btnSalvarClick(Sender: TObject);
    procedure btnBrowseClick(Sender: TObject);
  end;

function AppIniPath: string;
procedure LoadDBConfig(out AHost, APort, AUser, APassword, ADatabase: string);

var
  frmConfig: TfrmConfig;

implementation

{$R *.dfm}

function AppIniPath: string;
begin
  Result := ChangeFileExt(ParamStr(0), '.ini');
end;

procedure LoadDBConfig(out AHost, APort, AUser, APassword, ADatabase: string);
var
  Ini: TIniFile;
begin
  Ini := TIniFile.Create(AppIniPath);
  try
    AHost     := Ini.ReadString(INI_SECTION_DB, 'Host',     DB_DEFAULT_HOST);
    APort     := Ini.ReadString(INI_SECTION_DB, 'Port',     DB_DEFAULT_PORT);
    AUser     := Ini.ReadString(INI_SECTION_DB, 'User',     DB_DEFAULT_USER);
    APassword := Ini.ReadString(INI_SECTION_DB, 'Password', DB_DEFAULT_PASSWORD);
    ADatabase := Ini.ReadString(INI_SECTION_DB, 'Database', DB_DEFAULT_DATABASE);
  finally
    Ini.Free;
  end;
end;

procedure TfrmConfig.FormCreate(Sender: TObject);
var
  LHost, LPort, LUser, LPassword, LDatabase: string;
begin
  LoadDBConfig(LHost, LPort, LUser, LPassword, LDatabase);
  edtHost.Text     := LHost;
  edtPort.Text     := LPort;
  edtUser.Text     := LUser;
  edtPassword.Text := LPassword;
  edtDatabase.Text := LDatabase;
end;

procedure TfrmConfig.btnSalvarClick(Sender: TObject);
var
  Ini: TIniFile;
begin
  if Trim(edtHost.Text) = '' then
  begin
    ShowMessage('Informe o host do servidor.');
    edtHost.SetFocus;
    Exit;
  end;
  if Trim(edtDatabase.Text) = '' then
  begin
    ShowMessage('Informe o caminho do banco de dados.');
    edtDatabase.SetFocus;
    Exit;
  end;
  Ini := TIniFile.Create(AppIniPath);
  try
    Ini.WriteString(INI_SECTION_DB, 'Host',     Trim(edtHost.Text));
    Ini.WriteString(INI_SECTION_DB, 'Port',     Trim(edtPort.Text));
    Ini.WriteString(INI_SECTION_DB, 'User',     Trim(edtUser.Text));
    Ini.WriteString(INI_SECTION_DB, 'Password', edtPassword.Text);
    Ini.WriteString(INI_SECTION_DB, 'Database', Trim(edtDatabase.Text));
  finally
    Ini.Free;
  end;
  ModalResult := mrOk;
end;

procedure TfrmConfig.btnBrowseClick(Sender: TObject);
var
  Dlg: TOpenDialog;
begin
  Dlg := TOpenDialog.Create(nil);
  try
    Dlg.Title  := 'Selecionar banco Firebird';
    Dlg.Filter := 'Banco Firebird (*.fdb;*.gdb)|*.fdb;*.gdb|Todos os arquivos (*.*)|*.*';
    Dlg.FileName := edtDatabase.Text;
    if Dlg.Execute then
      edtDatabase.Text := Dlg.FileName;
  finally
    Dlg.Free;
  end;
end;

end.
