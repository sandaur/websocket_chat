<?php
namespace Src;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Src\Conect;

class Chat implements MessageComponentInterface {
    protected $clients;
    protected $conn;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $c = new Conect;
        $this->conn = $c->getConection();
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection to send messages to later
        $auxObj = json_decode("{}");
        $auxObj->conn = $conn;
        $auxObj->id = null;
        $this->clients->attach($auxObj);  // OBJ: {conn, id}

        //echo "New connection! ({$auxObj->conn->resourceId})".strval(sizeof($this->clients))."\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $json_income = json_decode(trim($msg,'"'));

        echo sprintf('LOG-MSG: ID: (%s) TYPE: (%s) ||<<'."\n"
            , self::getClientByConn($from)->id == null ? 'unreg' : self::getClientByConn($from)->id
            , $json_income->type);


        if( isset($json_income->type) ){
          switch ($json_income->type) {

            case 'sendm':  // Subir mensaje a la base de datos
              if( isset($json_income->user_id) && isset($json_income->user_passwd) ) {
                if( self::clientAuthenticity($json_income->user_id, $json_income->user_passwd) ){
                  $sql = "INSERT INTO mensajes (id_emi, id_rec, message)".
                  " VALUES (':id_emi:', ':id_rec:', ':message:')";
                  $sql = str_replace(':id_emi:',$json_income->user_id,$sql);
                  $sql = str_replace(':id_rec:',$json_income->dest_id,$sql);
                  $sql = str_replace(':message:',$json_income->message,$sql);

                  /* Devuelve el mensaje al remitente
                  junto al estado de la peticion (success) */
                  $json_rspc_from = json_decode("{}");
                    $json_rspc_from->type = "pushmsg";
                    if ($this->conn->query($sql) === TRUE) {
                      $json_rspc_from->success = "1";
                      $json_rspc_from->id_rec = $json_income->dest_id;
                      $json_rspc_from->message = $json_income->message;
                      //$json_rspc_from->respuesta = $sql;
                    } else {
                      $json_rspc_from->success = "0";
                      $json_rspc_from->respuesta = $sql;
                    }
                    foreach (self::getClientsById($json_income->user_id) as $client) {
                      $client->conn->send(json_encode($json_rspc_from));
                    }

                    // Avisar al receptor del nuevo mensaje si (success).
                    if( $json_rspc_from->success === "1" ){
                      $json_rspc_rcv = json_decode("{}");
                        $json_rspc_rcv->message = $json_income->message;
                        $json_rspc_rcv->from_id = $json_income->user_id;
                        $json_rspc_rcv->type = "newmsg";
                        foreach (self::getClientsById($json_income->dest_id) as $client) {
                          $client->conn->send(json_encode($json_rspc_rcv));
                        }
                      }
                    }
              }
              break;

            /* Es posible que dos o mas conneciones pertenescan
              a la misma cuenta y es util para saber a que coneccion
              mandar alertas de nuevos mensajes */
            case 'regid':  // Registrar id de la conneccion
              $auxObj = self::getClientByConn($from);
              if( $auxObj->id === null && self::clientAuthenticity($json_income->user_id, $json_income->user_passwd) ){
                $auxObj->id = $json_income->user_id;
                echo "LOG: CONNECTION REGISTERED WITH ID: ($auxObj->id) ###\n";
              }
              break;

            default:
              # code...
              break;
          }

        }
    }

    public function onClose(ConnectionInterface $conn) {
        // The connection is closed, remove it, as we can no longer send it messages

        $this->clients->detach(self::getClientByConn($conn));

        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";

        $conn->close();
    }

    /* Comprueba que el emisor no es un impostor */
    public function clientAuthenticity($p_id, $p_pass) {
        $sql = "SELECT * FROM users WHERE id=':id:' AND password=':passwd:'";
        $sql = str_replace(":id:",$p_id,$sql);
        $sql = str_replace(":passwd:",$p_pass,$sql);
        $result = mysqli_query($this->conn, $sql);

        if (mysqli_num_rows($result) > 0 ) {
            while($row = mysqli_fetch_assoc($result)) {
                return true;
                break;
            }
        } else {
            return false;
        }
    }

    public function getClientByConn($p_conn){
        $target = null;
        foreach ($this->clients as $client) {
            if($client->conn === $p_conn){
                $target = $client;
            }
        }

        return $target;
    }

    public function getClientsById($p_id){
        $r_clients = array();
        foreach ($this->clients as $client) {
            if( $client->id === $p_id ){
                array_push($r_clients, $client);
            }
        }

        return $r_clients;
    }
}
