<?php
include("connection.php");
session_start();

if (!isset($_SESSION['tid'])) {
    header("Location: sign.php");
    exit();
}

// Verify required session variables
if (!isset($_SESSION['tearm']) || !isset($_SESSION['year']) || !isset($_SESSION['cl'])) {
    header("Location: module_term.php");
    exit();
}

$me = $_SESSION['tid'];
$class = $_SESSION['cl'];
$term = $_SESSION['tearm'];
$year = $_SESSION['year'];

// Handle form submission
if (isset($_POST['selected_module'])) {
    $module_id = mysqli_real_escape_string($conn, $_POST['selected_module']);
    
    // Get module name
    $module_query = mysqli_query($conn, "SELECT mname FROM module WHERE moid = '$module_id'");
    if ($module_query && mysqli_num_rows($module_query) > 0) {
        $module_data = mysqli_fetch_assoc($module_query);
        $_SESSION['module'] = $module_id;
        $_SESSION['name'] = $module_data['mname'];
        header("Location: list.php");
        exit();
    } else {
        echo '<div class="error-message">Error: Module not found</div>';
    }
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
            max-width: 800px;
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
            font-size: 1.8rem;
        }
        
        .term-info {
            background-color: #e1f5fe;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        }
        
        form {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            width: 100%;
            padding: 10px;
        }
        
        button {
            width: 100%;
            padding: 15px;
            background-color: #3498db;
            color: white;
            font-size: 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .error-message {
            color: red;
            padding: 10px;
            text-align: center;
        }
        
        @media (max-width: 600px) {
            .cont {
                padding: 15px;
                min-height: 70vh;
            }
            
            h1 {
                font-size: 1.5rem;
                margin-bottom: 20px;
            }
            
            .button-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Module</h1>
        <div class="term-info">
            Term <?php echo htmlspecialchars($term); ?> - <?php echo htmlspecialchars($year); ?>
        </div>
        <form action="" method="post">
            <div class="button-grid">
                <?php
                $select = mysqli_query($conn, "SELECT module.* FROM module 
                    JOIN permision ON permision.mid = module.moid 
                    WHERE module.class = '$class' 
                    AND permision.tid = '$me'");
                
                if (!$select) {
                    echo '<div class="error-message">Error loading modules: ' . mysqli_error($conn) . '</div>';
                } elseif (mysqli_num_rows($select) <= 0) {
                    echo '<div class="error-message">No modules assigned to you for this class</div>';
                } else {
                    while ($a = mysqli_fetch_array($select)) {
                        echo '<button type="submit" name="selected_module" value="'.htmlspecialchars($a['moid']).'">'
                            .htmlspecialchars($a['mname']).'</button>';
                    }
                }
                ?>
            </div>
        </form>
    </div>
</body>
</html>