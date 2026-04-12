<?php
include("connection.php");
$row = $_GET['id'];
$select = mysqli_query($conn, "SELECT * FROM class,module where class.cid=module.class and moid='$row'");
while ($a = mysqli_fetch_array($select)) {
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Module Update</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .cont {
            max-width: 800px;
            width: 100%;
            margin: 20px auto;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            padding: 25px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 25px;
            text-align: center;
            font-size: 1.8rem;
        }
        
        .info {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .info span {
            font-weight: bold;
            color: #34495e;
            display: block;
            margin-bottom: 5px;
        }
        
        .info sup {
            color: #e74c3c;
        }
        
        input, select {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: border 0.3s;
        }
        
        input:focus, select:focus {
            border-color: #3498db;
            outline: none;
        }
        
        button {
            width: 100%;
            padding: 14px;
            background-color: #2ecc71;
            color: white;
            font-size: 1.1rem;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 15px;
        }
        
        button:hover {
            background-color: #27ae60;
        }
        
        @media (max-width: 768px) {
            .cont {
                padding: 20px;
                width: 95%;
            }
            
            h1 {
                font-size: 1.5rem;
                margin-bottom: 20px;
            }
            
            input, select {
                padding: 10px 12px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .cont {
                padding: 15px;
            }
            
            h1 {
                font-size: 1.3rem;
            }
            
            button {
                padding: 12px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <form action="" method="post">
        <div class="cont">
            <h1>Module Update</h1>
            <div class="info">
                <span>Module Name<sup>*</sup></span>
                <input type="text" name="name" value="<?php echo htmlspecialchars($a['mname'])?>" required>
                
                <span>Module Code<sup>*</sup></span>
                <input type="text" name="code" value="<?php echo htmlspecialchars($a['mcode'])?>" required>
                
                <span>Module Credit<sup>*</sup></span>
                <input type="text" name="credit" value="<?php echo htmlspecialchars($a['credit'])?>" required>
                
                <span>Module Type<sup>*</sup></span>
                <select name="type" required>
                    <option value="<?php echo htmlspecialchars($a['module_type'])?>"><?php echo htmlspecialchars($a['module_type'])?></option>
                    <option value="complementary">Complementary</option>
                    <option value="general">General</option>
                    <option value="specific">Specific</option>
                </select>
                
                <span>Class<sup>*</sup></span>
                <select name="trade" required>
                    <option value="<?php echo htmlspecialchars($a['cid'])?>" selected><?php echo htmlspecialchars($a['level'])?></option>
                    <?php
                    $se = mysqli_query($conn, "SELECT * FROM class");
                    while ($b = mysqli_fetch_array($se)) {
                    ?>
                    <option value="<?php echo htmlspecialchars($b['cid'])?>"><?php echo htmlspecialchars($b['level'])?></option>
                    <?php
                    } 
                    ?>
                </select>
                
                <button name="update">Update</button>
            </div>
        </div>
    </form>
</body>
</html>
<?php
}

if (isset($_POST['update'])) {
    $name = mysqli_real_escape_string($conn, $_POST['name']);
    $class = mysqli_real_escape_string($conn, $_POST['trade']);
    $code = mysqli_real_escape_string($conn, $_POST['code']);
    $type = mysqli_real_escape_string($conn, $_POST['type']);
    $credit = mysqli_real_escape_string($conn, $_POST['credit']);
    
    $update = mysqli_query($conn, "UPDATE module SET mname='$name', credit='$credit', mcode='$code', module_type='$type', class='$class' WHERE moid='$row'");
    header("location:module.php");
    exit();
}
?>