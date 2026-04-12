<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.php");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Term</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        
        body {
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .cont {
            width: 100%;
            max-width: 800px;
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        h1 {
            margin-bottom: 30px;
            color: #333;
            font-size: 2rem;
        }
        
        .buttons-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
        }
        
        button {
            width: 100%;
            padding: 20px;
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        button:hover {
            background-color: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        /* Tablet and larger mobile devices */
        @media (min-width: 480px) {
            .buttons-container {
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            button {
                width: calc(50% - 10px);
                max-width: 300px;
            }
        }
        
        /* Desktop and larger tablets */
        @media (min-width: 768px) {
            h1 {
                font-size: 2.5rem;
                margin-bottom: 40px;
            }
            
            button {
                font-size: 1.3rem;
                padding: 25px;
            }
        }
        
        /* Very small mobile devices */
        @media (max-width: 360px) {
            .cont {
                padding: 20px 15px;
            }
            
            h1 {
                font-size: 1.7rem;
                margin-bottom: 20px;
            }
            
            button {
                padding: 15px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Term</h1>
        <form action="" method="post">
            <div class="buttons-container">
            <?php
            $select = mysqli_query($conn, "SELECT distinct(team) from marks");
            $count = 0;
            while ($a = mysqli_fetch_array($select)) {
                $count++;
                $view = "cals{$count}";
                ?>
                <button name="<?php echo $view ?>"><?php echo 'Term '.$a['team'];?></button>
                <?php
                if (isset($_POST[$view])) {
                    $_SESSION['term'] = $a['team'];
                    header("location:report.php");
                }
            }
            if (mysqli_num_rows($select) > 2) {
                echo "<button name='yearl'>Year</button>";
                if (isset($_POST['yearl'])) {
                    header("location:yearl_report.php");
                }
            }
            ?>
            </div>
        </form>
    </div>
</body>
</html>