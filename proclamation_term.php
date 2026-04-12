<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Process form submissions before any HTML output
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $select = mysqli_query($conn, "SELECT DISTINCT(team) FROM marks ORDER BY team");
    $count = 0;
    
    while ($a = mysqli_fetch_array($select)) {
        $count++;
        $view = "cals{$count}";
        $termNumber = $a['team'];
        
        if (isset($_POST[$view])) {
            $_SESSION['term'] = $termNumber;
            header("location:proclamation.php");
            exit();
        }
    }
    
    if (isset($_POST['yearl'])) {
        $_SESSION['term'] = "year";
        header("location:proclamation.php");
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Select Term</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #4CAF50;
            --secondary-color: #45a049;
            --accent-color: #2E7D32;
            --light-color: #f8f9fa;
            --dark-color: #343a40;
            --text-color: #212529;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: var(--light-color);
            color: var(--text-color);
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 1200px;
            padding: 30px;
            text-align: center;
        }
        
        h1 {
            color: var(--primary-color);
            margin-bottom: 30px;
            font-size: 2.5rem;
            font-weight: 600;
        }
        
        .term-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .term-btn {
            background-color: var(--light-color);
            color: var(--primary-color);
            border: 2px solid var(--primary-color);
            padding: 20px;
            font-size: 1.5rem;
            font-weight: 600;
            border-radius: 10px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            box-shadow: var(--shadow);
        }
        
        .term-btn:hover {
            background-color: var(--primary-color);
            color: white;
            transform: translateY(-5px);
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }
        
        .term-btn i {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .year-btn {
            background-color: var(--accent-color);
            color: white;
            border: 2px solid var(--accent-color);
            grid-column: 1 / -1;
        }
        
        .year-btn:hover {
            background-color: #1B5E20;
            border-color: #1B5E20;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            
            .term-btn {
                font-size: 1.2rem;
                min-height: 100px;
            }
            
            .container {
                padding: 15px;
            }
        }
        
        @media (max-width: 480px) {
            .term-grid {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 1.8rem;
            }
            
            .term-btn {
                padding: 15px;
                min-height: 80px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Select Term for Proclamation</h1>
        <form action="" method="post" class="term-form">
            <div class="term-grid">
                <?php
                $select = mysqli_query($conn, "SELECT DISTINCT(team) FROM marks ORDER BY team");
                $count = 0;
                
                while ($a = mysqli_fetch_array($select)) {
                    $count++;
                    $view = "cals{$count}";
                    $termNumber = $a['team'];
                ?>
                <button type="submit" name="<?php echo $view ?>" class="term-btn">
                    <i class="fas fa-calendar-alt"></i>
                    Term <?php echo $termNumber ?>
                </button>
                <?php
                }
                
                if (mysqli_num_rows($select) > 2) {
                ?>
                <button type="submit" name="yearl" class="term-btn year-btn">
                    <i class="fas fa-calendar-check"></i>
                    Annual Report
                </button>
                <?php
                }
                ?>
            </div>
        </form>
    </div>
</body>
</html>