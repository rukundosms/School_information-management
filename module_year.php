<?php
include("connection.php");
session_start();
$class = $_SESSION['cl'];
if (!isset($_SESSION['tid'])) {
    header("location:index.html");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Year</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f8f9fa;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .cont {
            width: 100%;
            max-width: 1200px;
            background-color: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        h1 {
            margin-bottom: 30px;
            color: #2c3e50;
            font-size: 2.2rem;
            font-weight: 600;
        }
        
        .no-data {
            color: #e74c3c;
            font-size: 1.5rem;
            margin: 40px 0;
        }
        
        form {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
        }
        
        button {
            flex: 1 1 calc(25% - 20px);
            min-width: 150px;
            padding: 20px;
            background-color: #3498db;
            color: white;
            font-weight: bold;
            font-size: 1.4rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        
        /* Responsive adjustments */
        @media (max-width: 992px) {
            button {
                flex: 1 1 calc(33% - 20px);
                font-size: 1.3rem;
                padding: 18px;
            }
        }
        
        @media (max-width: 768px) {
            .cont {
                padding: 20px;
            }
            
            h1 {
                font-size: 1.8rem;
            }
            
            button {
                flex: 1 1 calc(50% - 20px);
                font-size: 1.2rem;
                padding: 16px;
            }
            
            .no-data {
                font-size: 1.3rem;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .cont {
                padding: 15px;
                border-radius: 8px;
            }
            
            h1 {
                font-size: 1.5rem;
                margin-bottom: 20px;
            }
            
            button {
                flex: 1 1 100%;
                font-size: 1.1rem;
                padding: 14px;
            }
            
            .no-data {
                font-size: 1.1rem;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Year</h1>
        <form action="" method="post">
            <?php
$select = mysqli_query($conn, "
    SELECT DISTINCT 
        m.year AS marks_year_id,  -- This is the foreign key from marks table
        y.year_id,                -- This is the primary key from year table
        y.year AS academic_year,  -- This is the actual year value
        y.status
    FROM marks m
    INNER JOIN year y ON m.year = y.year_id
    ORDER BY y.year DESC
");
            if (mysqli_num_rows($select) <= 0) {
                echo "<div class='no-data'>No marks entered in system</div>";
            }
            
            $count = 0;
            while ($a = mysqli_fetch_array($select)) {
                $count++;
                $view = "cals{$count}";
            ?>
           <button name="<?php echo htmlspecialchars($view); ?>">
    <?php 
    echo htmlspecialchars($a['marks_year_id']) . ' - ' . 
         htmlspecialchars($a['academic_year']);
    ?>
</button>
            <?php
                if (isset($_POST[$view])) {
                    $_SESSION['year'] = $a['marks_year_id'];
                    header("location:module_term.php");
                }
            }
            ?>
        </form>
    </div>
</body>
</html>