<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Login</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: #f0f7f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .cont {
            width: 100%;
            max-width: 450px;
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0, 100, 0, 0.1);
            text-align: center;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 25px;
            font-size: 2rem;
        }
        
        form {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
        }
        
        span {
            font-size: 1rem;
            color: #2c3e50;
            font-weight: 600;
            margin-bottom: 8px;
            display: block;
        }
        
        sup {
            color: #e74c3c;
            font-size: 0.8rem;
        }
        
        input {
            width: 100%;
            padding: 12px 15px;
            margin-bottom: 20px;
            border: 1px solid #bdc3c7;
            border-radius: 6px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        input:focus {
            border-color: #27ae60;
            outline: none;
            box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.2);
        }
        
        input::placeholder {
            color: #95a5a6;
        }
        
        button {
            width: 100%;
            padding: 12px;
            background-color: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        button:hover {
            background-color: #219653;
            transform: translateY(-2px);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        /* Responsive adjustments */
        @media (max-width: 480px) {
            .cont {
                padding: 25px 20px;
            }
            
            h1 {
                font-size: 1.7rem;
                margin-bottom: 20px;
            }
            
            input, button {
                padding: 10px 12px;
            }
        }
        
        /* Animation for form */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .cont {
            animation: fadeIn 0.5s ease-out;
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Teacher Login</h1>
        <form action="" method="post">
            <span>Teacher Code <sup>*</sup></span>
            <input type="text" name="code" placeholder="Enter your teacher code" required>
            <button name='contnue'>Next</button>
        </form>
    </div>
</body>
</html>

<?php
session_start();
include("connection.php");
if (isset($_POST['contnue'])) {
    $code = mysqli_real_escape_string($conn, $_POST['code']);
    $select = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$code'");
    
    if (mysqli_num_rows($select) < 1) {
        echo "<script>
                alert('The code you entered does not exist in our system');
                window.location.href = 'sign.php';
              </script>";   
    } else {
        $a = mysqli_fetch_array($select);
        $_SESSION['tid'] = $a['tid']; 
        $_SESSION['tcode'] = $a['tcode']; 
        $_SESSION['lname'] = $a['lname'];  
        $_SESSION['fname'] = $a['fname'];
        header("Location:userlogin.php");
        exit();
    }
}
?>