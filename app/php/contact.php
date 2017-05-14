<?php

//User got here directly or posted nothing. What.
if (empty($_POST)) {
    echo '<strong>Error:</strong> This script expects form data.';
    return;
}

//We support non-ajax requests to be nice to those without JS enabled
$ajax = !empty($_POST['ajax']);

//Required stuff
if (empty($_POST['email']) || empty($_POST['message'])) {
    if ($ajax) {
        echo json_encode(['error' => true, 'code' => 1]);
    } else {
        echo '<strong>Oh dear!</strong> There was an error sending your email, please try again.<br>
                If it keeps messing up, feel free to email me the old fashioned way at
                <a href="mailto:david@dharveydev.com">david@dharveydev.com</a>';
    }
    return;
}

//Ghetto antispam
if (!empty($_POST['url'])) {
    if ($ajax) {
        echo json_encode(['success' => true]);
    } else {
        echo '<strong>Thanks!</strong> Your message has been sent and I will get back to you as soon as I can.';
    }
    return;
}

$name = (isset($_POST['name']) && !empty($_POST['name']) ? $_POST['name'] : 'Unknown');
$email = $_POST['email'];
$message = $_POST['message'];


/*************************
 * User input validation
 *************************/

$errors = [];

//Is email an email?
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}

//Is message within length limit?
if (strlen($message) < 3) {
    $errors['message'] = 'Your message is a tad too short! Please enter at least 3 characters.';
}
if (strlen($message) > 1000) {
    $errors['message'] = 'Your message is a bit too long! Please keep it under 1000 characters.';
}

if (count($errors)) {
    if ($ajax) {
        echo json_encode(['errors' => $errors]);
    } else {
        foreach ($errors as $error) {
            echo $error . '<br>';
        }
    }
    return;
}


//We can get our config and vendor files now
$config = parse_ini_file(__DIR__ . '/../../config.ini');
require __DIR__ . '/../../vendor/autoload.php';


/*************************
 * Actually send an email
 *************************/

$mailErrors = __DIR__ . '/../../mail-errors.log';
$mail = new PHPMailer;

$mail->isSMTP();
$mail->Host = $config['smtp_host'];
$mail->SMTPAuth = true;
$mail->Username = $config['smtp_username'];
$mail->Password = $config['smtp_password'];
$mail->SMTPSecure = 'tls';
$mail->Port = 587;

$mail->From = 'david@dharveydev.com';
$mail->FromName = 'Automailer';
$mail->addAddress('david@dharveydev.com', 'David Harvey');
$mail->addReplyTo($email, $name);

$mail->WordWrap = 50;
$mail->isHTML(true);
$mail->Subject = 'Automated portfolio contact email: ' . $email;
$mail->Body = $message;

if (!$mail->send()) {
    file_put_contents($mailErrors, '[' . date('Y-m-d H:i:s') . '] ' . $mail->ErrorInfo . PHP_EOL, FILE_APPEND);
    if ($ajax) {
        echo json_encode(['error' => true, 'code' => 4]);
    } else {
        echo '<strong>Oh dear!</strong> There was an error sending your email, please try again.<br>
                If it keeps messing up, feel free to email me the old fashioned way at
                <a href="mailto:david@dharveydev.com">david@dharveydev.com</a>';
    }
    return;
}

if ($ajax) {
    echo json_encode(['success' => true]);
} else {
    echo '<strong>Thanks!</strong> Your message has been sent and I will get back to you as soon as I can.';
}