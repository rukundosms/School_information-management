<?php
include("connection.php");
session_start();

if (!isset($_SESSION['tid'])) {
    header("location:index.html");
    exit();
}

if (!isset($_SESSION['year'])) {
    header("location:module_year.php");
    exit();
}

$year = $_SESSION['year'];
$tid = $_SESSION['tid'];
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
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            min-height: calc(100vh - 40px);
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        
        .buttons-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
        }
        
        button {
            padding: 15px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        button:hover {
            background-color: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .error-message {
            color: red;
            text-align: center;
            margin-bottom: 20px;
        }
        
        @media (min-width: 600px) {
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
    </style>
</head>
<body>
    <div class="container">
        <h1>Choose Term for <?php echo htmlspecialchars($year); ?></h1>
        <form action="" method="post">
            <div class="buttons-container">
            <?php
            $select = mysqli_query($conn, "SELECT DISTINCT(team) FROM marks WHERE year = '$year' AND tid = '$tid'");
            
            if (mysqli_num_rows($select) <= 0) {
                echo '<div class="error-message">No terms found for selected year</div>';
            }
            
            while ($a = mysqli_fetch_array($select)) {
                echo '<button type="submit" name="selected_term" value="'.htmlspecialchars($a['team']).'">'
                    .'Term '.htmlspecialchars($a['team']).'</button>';
            }
            
            if (isset($_POST['selected_term'])) {
                $_SESSION['tearm'] = $_POST['selected_term'];
                header("Location: mymodules.php");
                exit();
            }
            ?>
            </div>
        </form>
    </div> 
</body>
</html>