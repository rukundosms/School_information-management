<?php
include("connection.php");
session_start();
$me = $_SESSION['tid']; 
  
if (!isset($_SESSION['tid'])) {
    header("location:sing.php");
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
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .cont {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            min-height: 80vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 30px;
            text-align: center;
            font-size: 2rem;
        }
        
        .no-class {
            color: #e74c3c;
            text-align: center;
            font-size: 1.2rem;
            padding: 20px;
        }
        
        form {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            width: 100%;
            padding: 10px;
        }
        
        button {
            width: 100%;
            padding: 20px 15px;
            background-color: #2ecc71;
            color: white;
            font-size: 1.2rem;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
        }
        
        button:hover {
            background-color: #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        
        @media (max-width: 768px) {
            .cont {
                padding: 15px;
                min-height: 70vh;
                width: 95%;
            }
            
            h1 {
                font-size: 1.5rem;
                margin-bottom: 25px;
            }
            
            .button-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            button {
                padding: 18px 12px;
                font-size: 1.1rem;
            }
            
            .no-class {
                font-size: 1rem;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .cont {
                padding: 10px;
            }
            
            button {
                padding: 16px 10px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Class</h1>
        <form action="" method="post">
            <div class="button-grid">
                <?php
                $select = mysqli_query($conn, "SELECT distinct(permision.tid),class.level,class.class_name,permision.cid,class.cid from class,permision where class.cid=permision.cid and permision.tid='$me'");
                if (mysqli_num_rows($select) <= 0) {
                    echo "<div class='no-class'>No classes available for you</div>";
                }
                
                $count = 0;
                while ($a = mysqli_fetch_array($select)) {
                    $count++;
                    $view = "cals{$count}";
                ?>
               <button name="<?php echo $view; ?>"><?php echo $a['level'] . ' ' . $a['class_name']; ?></button>
                <?php
                    if (isset($_POST[$view])) {
                        $_SESSION['cl'] = $a['cid'];
                        $_SESSION['level'] = $a['level'];
                        header("location:module_year.php");
                    }
                }
                ?>
            </div>
        </form>
    </div>
</body>
</html>