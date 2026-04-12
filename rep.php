<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Class</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .cont {
            width: 100%;
            max-width: 1200px;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        h1 {
            margin-bottom: 30px;
            color: #333;
            font-size: 2rem;
        }
        
        .buttons-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            width: 100%;
        }
        
        button {
            padding: 15px;
            background-color: #fff;
            color: #333;
            font-weight: bold;
            font-size: 1.2rem;
            border: none;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            background-color: #f0f0f0;
        }
        
        @media (max-width: 768px) {
            .buttons-container {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            button {
                font-size: 1rem;
                padding: 12px;
            }
        }
        
        @media (max-width: 480px) {
            .cont {
                padding: 20px 15px;
            }
            
            .buttons-container {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 1.3rem;
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Class</h1>
        <form action="" method="post">
            <div class="buttons-container">
            <?php
            $select=mysqli_query($conn,"SELECT * from class");
            $count=0;
                while ($a=mysqli_fetch_array($select)) {
            $count++;
            $view="cals{$count}";
                    ?>
            <button name="<?php echo $view ?>"><?php echo $a['level'];?><?php echo $a['class_name'];?></button>
                <?php
                if (isset($_POST[$view])) {
                    $_SESSION['cl']=$a['cid'];
                    $_SESSION['t']=$a['trid'];
                    header("location:yr.php");
                }
                }
                ?>
            </div>
        </form>
    </div>
</body>
</html>