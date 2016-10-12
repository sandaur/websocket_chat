$(document).ready(function () {

  /* this is the ip direction that the client will use to connect to the server.
   If you change the port remember to do the same on /bin/chat-server.php */
  var wsServer = 'ws://181.74.195.247:8080';
  var conn = new WebSocket(wsServer);
  bindConnEvents(conn);

  var php_responce = "src/responce.php";
  var $chatContainer = $( "#chat-container" );
  var cb_size = 265 + 9;  // Width of a chat-box + a pinch
  var idReconnInterval, reconnRate = 5000;

  var template = '<div id=":dest_id:" class="cb">'+
  '<img src=":avatar:" class="img-holder" alt="foto" />'+
  '<div class="chat-box">'+
  '<div class="cb-head">:nickname:<div class="btn-quit">X</div></div>'+
  '<div class="cb-hback"><div class="cb-hist"></div></div>'+
  '<div class="cb-input">'+
  '<form class="cb-form" action="index.html" method="post">'+
  '<input type="text" name="message" autocomplete="off">'+
  '<input type="hidden" name="dest_id" value=":dest_id:">'+
  '</form>'+
  '</div>'+
  '</div></div>';

  var msg_template = '<span class="indiv"><div class="cb-hist-msg"><div class="cb-hm-text">'+
  ':message_holder:'+
  '</class></div></span>';

  var excess_template = '<div class="ce hide"><div class="ce-select hide"></div><div class="chat-excess">'+
  '<p>0</p></div></div>';

  var msgGroup_template = '<span class=":from: msg-group new"></span>';
  var img_foto_template = '<img src=":avatar:" alt="foto" />';


  var connections = [];
  function loadTest(nn){
    for(i = 0;i < nn;i++){
      cnx = new WebSocket(wsServer);
      connections.push(cnx);
      setInterval(function() {
        isSessionAlive(connections[connections.length-1]);
        connections[connections.length-1].send('{"message":"MENSAJE DE PRUEBAS BASTANTE LARGO PERO ENREALIDAD NO TANTO","dest_id":"3","type":"sendm","user_id":"1","user_passwd":"hola123"}');
      }, Math.floor((Math.random() * 6000) + 3000) );

    }
  }
  $("#loadtest").on('click', function (ev) {
    loadTest(100);
  })

  /* Routine function that is responsible for the chat-excess display.
      - Appear and hide the chat-excess.
      - Update the number of chat-box hidden.*/
  function updateCEStatus() {
    $(".ce p").text($(".cb.cb-hide").size());
    if ( $(".cb.cb-hide").size() > 0 ) {
      $(".ce").removeClass("hide");
    } else {$(".ce").addClass("hide");}

    height_ce = $(".ce-select").height();
    $(".ce-select").css({top:-height_ce});
  }

  /* Routine function that is responsible for the correct display of the chat-box in the chat container.
      - Appear and hide the chat-box that does not fit in the window.
      - manage the height of the maximised chat-box when the height of
        the window is lower than the height of a maximised chat-box.*/
  function updateChatBoxes() {
    var xx = Math.round(($(window).width()-cb_size)/cb_size);
    var yy = $(window).height();
    if ( xx > $(".cb").not(".cb-hide").size() ) {
      var cbVisible = xx - $(".cb").not(".cb-hide").size();
      for (i = 0; i < cbVisible; i++) {
          $target = $(".cb.cb-hide:first");
          $target.removeClass("cb-hide");
          $("#chat-container").append($target);
      }
    }if ( xx < $(".cb").not(".cb-hide").size() ) {
      var cbHide = $(".cb").not(".cb-hide").size() - xx;
      for (i = 0; i < cbHide; i++) {
          $target = $(".cb").not(".cb-hide").filter(":last");
          $target.addClass("cb-hide");
          $(".ce-select").prepend($target);
      }
    }
    if( yy < 350 && yy > 170){
      $(".chat-box").css("max-height", yy-20);
    } else if(yy > 350) {
      $(".chat-box").css("max-height", "400px");
    }
  }

  /* Checks if there are a user registered in _SESSION. It is used too
  to register the id of this connection in the websocket server.*/
  function isSessionAlive(p_conn) {
    $query = "type=sessionAlive";

    $.ajax({
    data: $query,
    url: php_responce,
    type: "GET",
    datatype: "json",
    success: function(data)
    {
        var $JSON_data = jQuery.parseJSON( data );
        if( $JSON_data.user_alive <= 0 ){
            $("#sign-container").show();
        } else if( p_conn.readyState === p_conn.OPEN ){
            $JSON_query = $.parseJSON( "{}" );
            $JSON_query['type'] = "regid";
            $JSON_query['user_id'] = $JSON_data['user_id'];
            $JSON_query['user_passwd'] = $JSON_data['user_passwd'];
            p_conn.send(JSON.stringify($JSON_query));
            console.log("TRY TO REGISTER SC: "+JSON.stringify($JSON_query));
        }
        console.log("Session Alive: "+data);
    }});
  }

  /* Create a new chat-box from an ID or Nickname */
  function newChat(nc_nick=null, nc_id=null) {
    var a = {conn_user: nc_nick, type: "getusrid"};
    if( nc_id ){
      a['conn_id'] = nc_id;
    }
    $query = $.param(a);
    console.log($query);

    $.ajax({
      data: $query,
      url: php_responce,
      type: "GET",
      datatype: "json",
      success: function(data)
      {
        console.log("Nuevo Chat: "+data);
        var $JSON_data = jQuery.parseJSON( data );
        if( $JSON_data.dest_id >= 0 ){
          var chat = template.replace(/:dest_id:/g, $JSON_data.dest_id)
          .replace(':nickname:', $JSON_data.dest_nick)
          .replace(':avatar:',$JSON_data.avatar);
          if( $("#"+$JSON_data.dest_id).length == 0 ){
            $chatContainer.append(chat);
            loadHist($JSON_data.dest_id, 15);
            updateChatBoxes();
            updateCEStatus();
          } else {alert("Ya existe ese chat!  (nuevo chat por *NICK/ID*)");}
        } else {alert("No existe un usuario con ese nombre!");}
      },
      error: function(result) {
        console.log("AJAX NOT WORKING (newChat) ***");
      }
    });
  }

  /* Request to the server for n_msg amount of messages for the chat
  with the id_rec. Then load the messages in the corresponding chat-box. */
  function loadHist(id_rec, n_msg){
      var a = {id_rec: id_rec, type: "gethist", nmsg: n_msg};
      $query = $.param(a);

      $.ajax({
        data: $query,
        url: php_responce,
        type: "GET",
        datatype: "json",
        success: function(data)
        {
          var $JSON_data = jQuery.parseJSON( data );
          if( $JSON_data.success == 1 ){
            $rec_container = $("#chat-container").find("#"+id_rec);

            if( !$rec_container.length ){
              newChat(null,nc_id=$JSON_data['from_id']);
              $rec_container = $("#chat-container").find("#"+id_rec);
            }
            for (var i = 0; i < $JSON_data.messages.length; i++) {

              if( $rec_container.length ){
                $msg_final = msg_template.replace(':message_holder:',
                $JSON_data.messages[i].msg);

                if($JSON_data.messages[i].emi == id_rec){
                  $groupMsg = checkChatFlow($rec_container, "m-rcv");
                }else {
                  $groupMsg = checkChatFlow($rec_container, "m-send");
                }

                if( $groupMsg.hasClass("new") ){
                    $groupMsg.removeClass("new");
                    $groupMsg.append($msg_final);
                    img_avatar = img_foto_template.replace(':avatar:',$rec_container.find(".img-holder").attr('src'));
                    $groupMsg.append(img_avatar);
                    $rec_container.find(".cb-hist").append($groupMsg);
                } else {
                  $groupMsg.append($msg_final);
                }

                var $objDiv = $rec_container.find(".cb-hback");
                $objDiv.scrollTop($objDiv[0].scrollHeight);
              }

              //console.log("msg: "+$JSON_data.messages[i].msg);
            }
          } else {
            console.log("No hay mensajes para esta combersacion. ID: "+id_rec);
          }
        },
        error: function(result) {
          console.log("AJAX NOT WORKING (loadHist) ***");
        }
      });
  }

  /* This function is called from onClose event to try to recover
   the connection with the server. Is called inside a setInterval. */
  function tryReconect() {
      if( conn.readyState === conn.CLOSED ) {
          conn = new WebSocket(wsServer);
          bindConnEvents(conn);
          console.log("*** RECONNECTING ***");
      }
      if( conn.readyState === conn.OPEN ){
          if( idReconnInterval ){
              clearInterval(idReconnInterval);
              idReconnInterval = null;
          }
      }
  }
  /* Function that groups the adjacent messages from
   the same author in the same group-message container. */
  function checkChatFlow($chatBox, typeNM){
      $chatHist = $chatBox.find(".cb-hist");
      $lastGroup = $chatBox.find("span.msg-group:last");
      if( $lastGroup.length ){
          if( $lastGroup.hasClass("m-send")){
              if( typeNM == "m-send" ){
                return $lastGroup;
              } else {
                return $((msgGroup_template.replace(':from:', "m-rcv")));
              }
          }else {
              if( typeNM == "m-rcv" ){
                return $lastGroup;
              } else {
                return $((msgGroup_template.replace(':from:', "m-send")));
              }
          }
      } else {
        return $((msgGroup_template.replace(':from:', typeNM)));
      }
  }

  $.fn.serializeObject = function()
  {
      var o = {};
      var a = this.serializeArray();
      $.each(a, function() {
          if (o[this.name] !== undefined) {
              if (!o[this.name].push) {
                  o[this.name] = [o[this.name]];
              }
              o[this.name].push(this.value || '');
          } else {
              o[this.name] = this.value || '';
          }
      });
      return o;
  };


  function bindConnEvents(p_cnx) {
      p_cnx.onopen = function(e) {
          if( idReconnInterval ){
            clearInterval(idReconnInterval);
            idReconnInterval = null;
          }
          isSessionAlive(conn);
          console.log("Connection established! (onOpen)");
      };

      p_cnx.onmessage = function(e) {
          $JSON_data = $.parseJSON(e.data);

          if( $JSON_data.hasOwnProperty('type') ){
            switch ($JSON_data['type']) {
              case "pushmsg":  // Confirmation that the sent message has been written in the database.
              if( $JSON_data['success'] == 1 ){

                $rec_container = $("#chat-container").find("#"+$JSON_data['id_rec']);
                if( $rec_container.length ){
                  $msg_final = msg_template.replace(':message_holder:',
                  $JSON_data['message']);

                  $groupMsg = checkChatFlow($rec_container, "m-send");
                  if( $groupMsg.hasClass("new") ){
                      $groupMsg.removeClass("new");
                      $groupMsg.append($msg_final);
                      $rec_container.find(".cb-hist").append($groupMsg);
                  } else {
                    $groupMsg.append($msg_final);
                  }

                  var $objDiv = $rec_container.find(".cb-hback");
                  $objDiv.scrollTop($objDiv[0].scrollHeight);
                }
              }
              break;

              case "newmsg":  // The server notice for a new message
              $rec_container = $("#chat-container").find("#"+$JSON_data['from_id']);

              if( !$rec_container.length ){
                  newChat(null,nc_id=$JSON_data['from_id']);
                  $rec_container = $("#chat-container").find("#"+$JSON_data['from_id']);
              }

              if( $rec_container.length ){
                $msg_final = msg_template.replace(':message_holder:',
                            $JSON_data['message']);
                $hist = $rec_container.find(".cb-hback");
                $fBottom = false;
                /* If the scroll was in the bottom before receive a message the scroll
                  will keep in the bottom after the message have been received*/
                if($hist.scrollTop() + $hist.innerHeight() >= $hist[0].scrollHeight){
                    $fBottom = true;
                }

                /* Add the message to the chat history */
                $groupMsg = checkChatFlow($rec_container, "m-rcv");
                if( $groupMsg.hasClass("new") ){
                    $groupMsg.removeClass("new");
                    $groupMsg.append($msg_final);
                    img_avatar = img_foto_template.replace(':avatar:',$rec_container.find(".img-holder").attr('src'));
                    $groupMsg.append(img_avatar);
                    $rec_container.find(".cb-hist").append($groupMsg);
                } else {
                    $groupMsg.append($msg_final);
                }

                /* Make the scroll go to bottom if the flag was turned on. */
                if( $fBottom ) {
                    $hist.scrollTop($hist[0].scrollHeight);
                }
              }
              break;

              default:
              break;
            }
          }

          console.log("OnMessage: "+e.data);
      };

      p_cnx.onerror = function(error) {
          console.log("*** CONECCTION ERROR ***  (onError)--> "+error);
      };

      p_cnx.onclose = function(e){
          if( !idReconnInterval ) {
            idReconnInterval = setInterval(tryReconect, reconnRate);
          }
          console.log("*** CONECCTION CLOSED *** (onCLose)");
      }
  }

  // Creates a new chat from a nickname.
  $("#new-chat").click(function (ev) {
      newChat(nc_nick=$("#dest-id").val());
  })

  /* Calls the functions that manage the display of the of
   the chat-container when the resize event is called.*/
  $( window ).bind('resize',function() {
      updateChatBoxes();
      updateCEStatus();
  });

  // Controls for chat-box.
  $chatContainer.on('click', '.cb-head', function (ev) {
    /* If chat-box outside chat-excess is clicked, then change
     chat-box from the max size to the min size and vice versa */
    if( $(this).closest(".cb").not(".cb-hide").length ) {
        $(this).closest(".chat-box").toggleClass("chat-box-max");
        if( $(this).closest(".chat-box").hasClass("chat-box-max") ) {
            updateChatBoxes();  // REVIZAR *******************
            $(this).closest(".chat-box input[name='message']").focus();
        }
    }
    /* If chat-box in chat-excess is clicked, this one change
     place with a chat-box outside the chat-excess */
    else {
        $targetMinim = $(".cb").not(".cb-hide").filter(":last");
        console.log($targetMinim);
        $targetMinim.addClass("cb-hide");
        $(".ce-select").prepend($targetMinim);

        $targetMaxim = $(this).closest(".cb");
        $targetMaxim.removeClass("cb-hide");
        $("#chat-container").append($targetMaxim);

        $(".ce-select").addClass("hide");
        updateChatBoxes();
        updateCEStatus();
    }
  }).on('click', '.btn-quit', function (ev) {  // Close chat-box
      $(this).closest(".cb").remove();
      updateChatBoxes();
      updateCEStatus();
  })

  // Display and hide the chat-excess selector. // ARREGLAR
  $chatContainer.on('click', '.chat-excess', function (ev) {
      $(".ce-select").toggleClass("hide");
  })

  /* Function that is responsible for send message in every chat-box. */
  $chatContainer.on('submit', '.cb-form', function (ev) {
      ev.preventDefault();
      $thisContext = $(this);
      trimmedValue = jQuery.trim($(this).find("input[name='message']").val());

      if( trimmedValue != "" ){
          $thisContext.find("input[name='message']").val(trimmedValue);

          $.ajax({
          data: "type=getsession",
          url: php_responce,
          type: "GET",
          datatype: "json",
          success: function(data)
          {
              $JSON_session = jQuery.parseJSON( data );
              $JSON_query = $thisContext.serializeObject();
              $JSON_query['type'] = "sendm";
              $JSON_query['user_id'] = $JSON_session['user_id'];
              $JSON_query['user_passwd'] = $JSON_session['user_passwd'];

              console.log("Esto enviare: "+JSON.stringify($JSON_query));
              conn.send(JSON.stringify($JSON_query));

              $thisContext.find("input[name='message']").val("");
          },
          error: function(result) {
              console.log("AJAX NOT WORKING (send message) ***");
          }
          });
      }
  })

  /* Sign in formulary. It hides when the user is logged. */
  $("#sign-form").submit(function(ev) {
      ev.preventDefault();
      $query = $("#sign-form").serialize();
      $query = $query.concat("&type=sign");
      //console.log($query);

      $.ajax({
      data: $query,
      url: php_responce,
      type: "GET",
      datatype: "json",
      success: function(data)
      {
          var $JSON_data = jQuery.parseJSON( data );
          if( $JSON_data.user_id >= 0 ){
            $("#sign-container").fadeOut("fast");
            isSessionAlive(conn);
          } else {
            alert("El usuario no existe o la contraseña es incorrecta.");
          }
          console.log("Inicio de session: "+data);
      },
      error: function() {
          console.log("AJAX NOT WORKING (session sign) ***");
      }});
  });

  // START ROUTINE  >>>>

  $chatContainer.append($(excess_template));
  isSessionAlive(conn);

  // START ROUTINE  <<<<

  newChat("colorless_41",null);
  newChat("sebastian",null);

})
