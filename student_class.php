<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Select Class</title>
    <style>
        :root {
            --primary-color: #3498db;
            --hover-color: #2980b9;
            --text-color: #2c3e50;
            --error-color: #e74c3c;
        }
        
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
            padding: 10px;
        }
        
        .cont {
            width: 100%;
            max-width: 900px;
            text-align: center;
        }
        
        h1 {
            color: var(--text-color);
            margin-bottom: 15px;
            font-size: 1.8rem;
        }
        
        .no-classes {
            color: var(--error-color);
            font-size: 1.1rem;
            margin: 15px 0;
        }
        
        .class-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        
        button {
            padding: 15px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        button:hover {
            background-color: var(--hover-color);
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 1.5rem;
            }
            
            .class-buttons {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
            
            button {
                font-size: 1rem;
                padding: 12px;
            }
        }
        
        @media (max-width: 480px) {
            h1 {
                font-size: 1.3rem;
                margin-bottom: 10px;
            }
            
            .class-buttons {
                grid-template-columns: 1fr;
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Class</h1>
        <form action="" method="post">
            <div class="class-buttons">
            <?php
            $select = mysqli_query($conn, "SELECT * FROM class");
            if (mysqli_num_rows($select) <= 0) {
                echo '<p class="no-classes">No classes exist in system</p>';
            }
            
            $count = 0;
            while ($a = mysqli_fetch_array($select)) {
                $count++;
                $view = "cals{$count}";
                ?>
                <button name="<?php echo htmlspecialchars($view); ?>">
                    <?php echo htmlspecialchars($a['level']." ".$a['class_name']); ?>
                </button>
                <?php
                if (isset($_POST[$view])) {
                    $_SESSION['cl'] = $a['cid'];
                    $_SESSION['t'] = $a['trid'];
                    
                    echo"<script>location='student.php'</script>";
                    
                }
            }
            
            ?>
            </div>
        </form>
    </div>
</body>
</html>