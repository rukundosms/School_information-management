<?php
include("connection.php");
$row=$_GET['id'];
$select=mysqli_query($conn,"SELECT * FROM trade where trid='$row'");
while ($a=mysqli_fetch_array($select)) {
    ?>
    <form action="" method="post">
    <div class="cont">
    <h1>Trade update</h1>
        <div class="info">
        <span>Trade Name<sup>*</sup></span><br>
        <input type="text" name="name" value="<?php echo $a['name']?>"><br>
        <span>Trade abriviation<sup>*</sup></span><br>
        <input type="text" name="ob" value="<?php echo $a['ob']?>"><br>
        <span>Trade Code<sup>*</sup></span><br>
        <input type="text" name="code" value="<?php echo $a['trade_code']?>"><br>
        <br>
        <button name="update">Update</button>
</div>
</div>
    </form>
    
    <?php
}
if (isset($_POST['update'])) {
$name=$_POST['name'];
$code=$_POST['code'];
$ob=$_POST['ob'];
$update=mysqli_query($conn,"UPDATE trade set name='$name',trade_code='$code',ob='$ob' where trid='$row'");
    header("location:trade.php");
    }
?>
<style>
    .cont{
        width: 30%;
        font-size: 14px;
        box-shadow: 0px 0px 3px 3px rgb(170, 204, 170);
        margin: auto;
        border-radius: 5px;
        text-align: center;
        padding: 10px;
    }
    button{
        font-size: 20px;
        background-color: green;
        cursor: pointer;
        border: none;
        border-radius: 3px;
        margin: 5px;
        padding: auto;
        font-weight: bold;
        color: white;
    }
    
</style>


