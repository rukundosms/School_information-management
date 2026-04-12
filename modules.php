<?php
include("connection.php");
session_start();
$me=$_SESSION['tid'];
$class=$_SESSION['cl']; 
if (!isset($_SESSION['tid'])) {
    header("location:index.htm");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Module</title>
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
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            min-height: 80vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        h1 {
            margin-bottom: 30px;
            color: #333;
            text-align: center;
            font-size: 2rem;
        }
        
        form {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
        }
        
        button {
            flex: 1 1 calc(50% - 30px);
            min-width: 200px;
            padding: 15px;
            background-color: #fff;
            color: #2c3e50;
            font-weight: bold;
            font-size: 1.2rem;
            border: none;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 80px;
        }
        
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
            background-color: #f0f0f0;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .cont {
                padding: 10px;
                min-height: 70vh;
            }
            
            h1 {
                font-size: 1.5rem;
                margin-bottom: 20px;
            }
            
            form {
                gap: 10px;
            }
            
            button {
                flex: 1 1 100%;
                min-width: unset;
                font-size: 1rem;
                min-height: 70px;
                padding: 12px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            button {
                font-size: 0.9rem;
                min-height: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Module</h1>
        <form action="" method="post">
            <?php
            $select=mysqli_query($conn,"SELECT * from module,permision where permision.mid=module.moid and module.class='$class' and permision.tid='$me'");
            $count=0;
            while ($a=mysqli_fetch_array($select)) {
                $count++;
                $view="cals{$count}";
            ?>
                <button name="<?php echo $view ?>"><?php echo $a['mname']?></button>
            <?php
                if (isset($_POST[$view])) {
                    $_SESSION['module']=$a['moid'];
                    $_SESSION['name']=$a['mname'];
                    header("location:marks.php");
                }
            }
            ?> 
        </form>
    </div>
</body>
</html>