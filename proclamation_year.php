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
    <title>Select Year</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f7fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .cont {
            width: 100%;
            max-width: 800px;
            padding: 20px;
            text-align: center;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 2rem;
        }
        
        .no-data {
            color: #e74c3c;
            margin: 20px 0;
            font-size: 1.2rem;
        }
        
        .year-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
        }
        
        button {
            flex: 1 1 200px;
            max-width: 250px;
            padding: 20px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.3rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        button:hover {
            background-color: #2980b9;
            transform: translateY(-3px);
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
        }
        
        button:active {
            transform: translateY(1px);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            h1 {
                font-size: 1.7rem;
                margin-bottom: 20px;
            }
            
            button {
                font-size: 1.1rem;
                padding: 15px;
                flex: 1 1 150px;
            }
        }
        
        @media (max-width: 480px) {
            .cont {
                padding: 15px;
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            .year-buttons {
                gap: 10px;
            }
            
            button {
                flex: 1 1 120px;
                font-size: 1rem;
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Year</h1>
        <form action="" method="post">
            <div class="year-buttons">
            <?php
            $select = mysqli_query($conn, "SELECT DISTINCT(year) FROM marks");
            if (mysqli_num_rows($select) <= 0) {
                echo "<p class='no-data'>No marks entered in system</p>";
            }
            
            $count = 0;
            while ($a = mysqli_fetch_array($select)) {
                $count++;
                $view = "cals{$count}";
                ?>
                <button name="<?php echo $view ?>"><?php echo htmlspecialchars($a['year']); ?></button>
                <?php
                if (isset($_POST[$view])) {
                    $_SESSION['year'] = $a['year'];
                    header("location:proclamation_term.php");
                    exit();
                }
            }
            ?>
            </div>
        </form>
    </div>
</body>
</html>