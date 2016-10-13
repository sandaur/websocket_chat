<?php
    namespace Src;
    include 'header.php';
    include 'Conect.php';
    header('Content-type: text/plain; charset=utf-8');

    $json_responce = array();
    $c = new Conect;
    $conn = $c->getConection();

    // Inicio de sesion. Devuelve id e inicia la sesion
    if( $_GET['type'] == 'sign' ){
        $sql = "SELECT * FROM users WHERE nick='".$_GET['user']."'";
        $result = mysqli_query($conn, $sql);

        if (mysqli_num_rows($result) > 0 && !isset($_SESSION['id'])) {

            while($row = mysqli_fetch_assoc($result)) {
                if($row["password"] == $_GET['passwd']) {
                    $json_responce['user_id'] = $row["id"];
                    $json_responce['user_nick'] = $row["nick"];

                    $_SESSION['user_id'] = $row["id"];
                    $_SESSION['user_nick'] = $row["nick"];
                    $_SESSION['user_passwd'] = $row["password"];
                    break;
                }
            }
            if (!isset($json_responce["user_id"])) {
                $json_responce['user_id'] = "-2";  // La contraseña no coincide
            }
        } else {
            $json_responce['user_id'] = "-1";   // No existe el usuario.
        }
    }
    // Pregunta si hay abierta una sesion
    else if( $_GET["type"] == "sessionAlive" ){
        if( isset($_SESSION['user_id']) ){
            $json_responce['user_alive'] = "1";
            $json_responce['user_id'] = $_SESSION["user_id"];
            $json_responce['user_nick'] = $_SESSION["user_nick"];
            $json_responce['user_passwd'] = $_SESSION["user_passwd"];
        } else if( !isset($_SESSION['user_id']) ) {
            $json_responce['user_alive'] = "-1";
        }
    }
    // Retorna el id en base al nickname o viceversa
    else if( $_GET["type"] == "getusrid" ){
        if( isset($_GET["conn_id"]) ){
          $sql = "SELECT * FROM users WHERE id='".$_GET['conn_id']."'";
        } else {
          $sql = "SELECT * FROM users WHERE nick='".$_GET['conn_user']."'";
        }
        $result = mysqli_query($conn, $sql);

        if (mysqli_num_rows($result) > 0 ) {

            while($row = mysqli_fetch_assoc($result)) {
                $json_responce['dest_id'] = $row["id"];
                $json_responce['dest_nick'] = $row["nick"];
                $json_responce['avatar'] = $row["avatar_url"];
                break;
            }
        } else {
            $json_responce['dest_id'] = "-1";   // No existe el usuario.
        }
    }
    // Devolver X mensajes antiguos. _GET {type, id_rec, nmsg}
    else if( $_GET["type"] == "gethist" ){
        if( isset($_SESSION['user_id']) ){
            $sql = "SELECT * FROM mensajes WHERE (id_emi=".$_SESSION['user_id']." AND id_rec=".$_GET['id_rec'].") OR (id_emi=".$_GET['id_rec']." AND id_rec=".$_SESSION['user_id'].") ORDER BY time_stamp DESC LIMIT ".$_GET['nmsg']." OFFSET ".$_GET['offset'];
            $result = mysqli_query($conn, $sql);
            $count = 0;

            if (mysqli_num_rows($result) > 0 ) {

              $msgs = array();
              while($row = mysqli_fetch_assoc($result)) {
                $msg_ind = array();
                $msg_ind['msg'] = $row['message'];
                $msg_ind['emi'] = $row['id_emi'];
                array_unshift($msgs, $msg_ind);

                /*$count = $count + 1;
                if( $count >= $_GET['nmsg'] ){
                  break;
                }*/
              }
              $json_responce['messages'] = $msgs;
              $json_responce['success'] = "1";
              $json_responce['query'] = $sql;
            } else {
              $json_responce['success'] = "0";   // No hay mensajes para esta peticion
            }
        } else {
          $json_responce['success'] = "0";   // No hay session iniciada.
        }
    }
    // Enviar variables de session
    else if( $_GET["type"] == "getsession" ) {
      foreach($_SESSION as $key => $value) {
          $json_responce[$key] = $value;
      }
    }
    // Captura mensaje enviado y lo sube a la base de datos
    else if( $_GET["type"] == "sendm" ){
      $sql = "INSERT INTO mensajes (id_emi, id_rec, message)".
      " VALUES (':id_emi:', ':id_rec:', ':message:')";
      $sql = str_replace(':id_emi:',$_SESSION['user_id'],$sql);
      $sql = str_replace(':id_rec:',$_GET['dest_id'],$sql);
      $sql = str_replace(':message:',$_GET['message'],$sql);

      if ($conn->query($sql) === TRUE) {
          $json_responce["success"] = "1";
          $json_responce["respuesta"] = $sql;
      } else {
          $json_responce["success"] = "0";
          $json_responce["respuesta"] = $sql;
      }
    }
    // Close session
    else if( $_GET["type"] == "closesession" ){
      session_destroy();

      $json_responce["success"] = "1";
    }

    echo json_encode($json_responce);
    session_write_close();
    exit();
 ?>
