<?php
include("connection.php");
session_start();
$me = $_SESSION['tid'];

if (!isset($_SESSION['tid'])) {
    header("location:index..html");
    exit();
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Class</title>
    <style>
        body {
            font-family: sans-serif;
            margin: 0;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .cont {
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            width: 80%; /* Adjust width for better mobile view */
            max-width: 600px; /* Limit maximum width on larger screens */
        }

        h1 {
            color: #333;
            margin-bottom: 20px;
        }

        form {
            display: flex;
            flex-wrap: wrap; /* Allow buttons to wrap to the next line on smaller screens */
            justify-content: center;
        }

        button {
            width: calc(50% - 20px); /* Two buttons per row with some spacing */
            height: 12vh; /* Adjust height based on content and screen size */
            margin: 10px;
            background-color: #fff;
            color: black;
            font-size: 1.5em; /* Adjust font size for readability */
            border: none;
            box-shadow: 0px 0px 5px 5px rgba(161, 196, 161, 0.3); /* Add some transparency */
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        button:hover {
            background-color: #e0f2e0;
        }

        /* Media query for smaller screens (e.g., phones) */
        @media (max-width: 600px) {
            .cont {
                width: 95%;
                padding: 20px;
            }

            button {
                width: calc(100% - 20px); /* One button per row on smaller screens */
                height: 10vh; /* Adjust height as needed */
                font-size: 1.2em;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <h1>Choose Class</h1>
        <form action="" method="post">
            <?php

            $select = mysqli_query($conn, "SELECT distinct(permision.tid),class.level,permision.cid,class.cid from class,permision where class.cid=permision.cid and permision.tid='$me'");
            if (mysqli_num_rows($select) <= 0) {
                echo "<h1>No class you are permitted</h1>";
            }
            $count = 0;
            while ($a = mysqli_fetch_array($select)) {
                $count++;
                $view = "cals{$count}";
                ?>
                <button name="<?php echo $view ?>"><?php echo $a['level']; ?></button>
                <?php
                if (isset($_POST[$view])) {
                    $_SESSION['cl'] = $a['cid'];
                    $_SESSION['level'] = $a['level'];
                    header("location:singel_modules.php");
                    exit();
                }
            }
            ?>
        </form>
    </div>
</body>
</html>