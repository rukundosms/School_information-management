<?php
include("connection.php");
session_start();

$class=$_SESSION['cl'];
if (!isset($_SESSION['id'])){
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
        max-width: 1200px;
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
        margin-bottom: 30px;
        color: #333;
        text-align: center;
        font-size: 2rem;
    }

    .year-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        width: 100%;
        padding: 20px;
    }

    button {
        padding: 15px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button:hover {
        background-color: #45a049;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .no-marks {
        color: #666;
        text-align: center;
        font-size: 1.5rem;
        margin-top: 50px;
    }

    span {
        font-size: 12px;
        color: rgb(243, 227, 16);
        padding: 2%;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .year-buttons {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }

        button {
            font-size: 1rem;
            min-height: 70px;
        }

        h1 {
            font-size: 1.5rem;
        }
    }

    @media (max-width: 480px) {
        .year-buttons {
            grid-template-columns: 1fr;
        }

        body {
            padding: 10px;
        }

        .container {
            padding: 15px;
        }
    }
    </style>
</head>

<body>
    <div class="container">
        <h1>Choose Year</h1>
        <form action="" method="post" class="year-buttons">
            <?php
            $select=mysqli_query($conn,"SELECT * from year");
            $count=0;
            while ($a=mysqli_fetch_array($select)) {
                $count++;
                $view="cals{$count}";
            ?>
            <button name="<?php echo $view ?>"><?php echo $a['year']?> <?php if ($a['status']=="active"){
echo" <span>Current</span>";
                }
                else{
                    echo"";
                }
                ?></button>
            <?php
                if (isset($_POST[$view])) {
                    $_SESSION['year']=$a['year_id'];
                    header("location:dod_term.php");
                }
            }
            ?>
        </form>
    </div>
</body>

</html>