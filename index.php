<!DOCTYPE HTML>
<html>
<head>
  <title>Chat</title>
  <meta charset="utf-8">
  <link rel="stylesheet" href='https://fonts.googleapis.com/css?family=Roboto' type="text/css">
  <link rel="stylesheet" href="css/index.css" media="screen">
<script src="js/jquery.js" type="text/javascript"></script>
</head>

<body>

  <div id="app-container">
    <input id="dest-id" type="text" name="conn_user" value="">
    <button id="new-chat" type="button" name="button">Nuevo Chat</button>
    <button id="loadtest" type="button" name="button">Load Test</button>
    <p id="pp">
    </p>
    <section id="chat-container">
    </section>
    <section id="sign-container">
      <form id="sign-form" action="index.html" method="post">
        <input type="text" name="user" value="" placeholder="user name">
        <input type="password" name="passwd" value="" placeholder="password">
        <input type="submit" name="submit" value="Log in">
      </form>
    </section>
  </div>
<script src="js/index.js" type="text/javascript"></script>
</body>
</html>
