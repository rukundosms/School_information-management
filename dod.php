<?php
session_start();
if (!isset($_SESSION['id'])) {
   header("location:index.html");
}
include("connection.php");
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>home</title>
</head>

<body>
    <div class="cont">
        <div class="top">
            <div class="s"><img src="images/logo.jpg" alt="">
                <h1><?php 
        $info=mysqli_query($conn,"SELECT * from school");
        $i=mysqli_fetch_array($info);
        echo $i['school_name'];
        ?></h1>
            </div>
            <div class="user">
                <h1><?php echo $_SESSION['username'] ?></h1>
            </div>
        </div>
        <div class="center">
            <div class="left">

                <h1>class</h1>
                <nav>
                    <form action="" method="POST">
                        <?php
                $select=mysqli_query($conn,"SELECT * from class");
                $count=0;
                    while ($a=mysqli_fetch_array($select)) {
            $count++;
            $view="cals{$count}"; 
            
                        ?>
                        <button name="<?php echo $view ?>"><?php echo $a['level'].$a['class_name'];?></button>
                        <?php
                if (isset($_POST[$view])) {
                   $_SESSION['cl']=$a['cid'];
                    header("location:dod_year.php");
                }
                    }
                    ?>
                    </form>
                </nav>
                <a href="logout.php">Logout</a>
            </div>
            <iframe src="" frameborder="0" name="screen"></iframe>
        </div>
    </div>
</body>

</html>
<style>
* {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    font-family: sans-serif;

}

iframe {
    width: 85%;
    height: 90vh;
    background-color: #fff;
    background-size: cover;

}

.cont {
    width: 100%;
    height: 10vh;
    background-color: solid white;
}

.top {
    width: 100%;
    height: 10vh;
    background-color: rgb(8, 58, 8);
    display: flex;
    color: #fff;


}

.s {
    width: 60%;
    background-color: transparent;
    height: 10vh;
    text-align: center;
}

.user {
    height: 100%;
    width: 40%;
    background-color: transparent;
    text-align: center;
}

nav {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    position: relative;
    height: 500px;
}

a {
    width: fit-content;
    height: fit-content;
    text-decoration: none;
    padding: 5px;
    position: relative;
    border-radius: 5pc;
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 5%;
    margin-top: 3%;


}

nav button {
    width: 100%;
    height: 50px;
    margin-top: 1px;
    border: solid rgb(21, 230, 21) 1px;
}

.left h1 {
    margin-top: 5%;
}

button:hover {
    background-color: transparent;
    color: #fff;
    cursor: pointer;
}

a::after {
    content: '';
    width: 0%;
    position: absolute;
    background-color: white;
    height: 2px;
    left: 0;
    bottom: 0;
    transition: 0.3s ease-in-out;
}

img {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    margin: 5px;
    float: left;
    background-color: rgb(168, 167, 165);
}

nav a:hover::after {
    content: '';
    width: 100%;
    position: absolute;
    background-color: white;
    height: 2px;
    left: 0;
    bottom: 0;
    transition: 0.2s;
}

.left {
    width: 15%;
    height: 90vh;
    background-color: green;

}

.center {
    display: flex;

}
</style>