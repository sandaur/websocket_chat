<?php
namespace Src;

class Conect
{
  protected $conn;
  protected $servername = "localhost";
  protected $username = "root";
  protected $password = "";
  protected $dbname = "chat_bd";

  function __construct()
  {
    $this->conn = mysqli_connect($this->servername, $this->username,
     $this->password, $this->dbname);
  }

  public function getConection(){
    return $this->conn;
  }
}

 ?>
