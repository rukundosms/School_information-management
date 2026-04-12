<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Class Management</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .cont {
            width: 100%;
            min-height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }
        
        h1 {
            text-align: center;
            margin: 15px 0;
            color: #2c3e50;
            font-size: 1.8rem;
        }
        
        .old {
            width: 100%;
            margin-bottom: 30px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            background: white;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #3498db;
            color: white;
            font-weight: 600;
        }
        
        tr:hover {
            background-color: #f1f1f1;
        }
        
        a {
            display: inline-block;
            padding: 6px 12px;
            margin: 2px;
            text-decoration: none;
            font-size: 0.85rem;
            text-transform: uppercase;
            font-weight: bold;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        a:first-of-type {
            background-color: #2ecc71;
            color: white;
        }
        
        a.delete {
            background-color: #e74c3c;
            color: white;
        }
        
        a:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .add {
            width: 100%;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .info {
            width: 100%;
            max-width: 500px;
            margin: 0 auto;
        }
        
        .info span {
            display: block;
            text-align: left;
            margin: 10px 0 5px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .info input {
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            transition: border 0.3s;
        }
        
        .info input:focus {
            border-color: #3498db;
            outline: none;
        }
        
        button {
            padding: 10px 20px;
            background-color: #2ecc71;
            color: white;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            margin-top: 10px;
        }
        
        button:hover {
            background-color: #27ae60;
            transform: translateY(-1px);
        }
        
        /* Responsive adjustments */
        @media (min-width: 768px) {
            .cont {
                flex-direction: row;
                align-items: flex-start;
                padding: 30px;
            }
            
            .old {
                width: 60%;
                margin-right: 30px;
                margin-bottom: 0;
            }
            
            .add {
                width: 40%;
                position: sticky;
                top: 20px;
            }
            
            h1 {
                font-size: 2rem;
            }
        }
        
        @media (max-width: 600px) {
            th, td {
                padding: 8px 10px;
                font-size: 0.9rem;
            }
            
            a {
                padding: 4px 8px;
                font-size: 0.75rem;
            }
        }
        
        /* Print styles */
        @media print {
            .add, button, a {
                display: none;
            }
            
            .old {
                width: 100%;
            }
            
            table {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <form action="" method="POST">
        <div class="cont">
            <div class="old">
                <h1>Level</h1>
                <table>
                    <thead>
                        <tr>
                            <th>N<sup><u>o</u></sup></th>
                            <th>Class Level</th>
                            <th>Code</th>
                            <th>Option</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        include("connection.php");
                        $select = mysqli_query($conn, "select * from class");
                        while ($a = mysqli_fetch_array($select)) {
                            echo "<tr>
                                    <td>".$a['cid']."</td>
                                    <td>".$a['level']." ".$a['class_name']."</td>
                                    <td>".$a['class_code']."</td>
                                    <td>
                                        <a href='cupdate.php?id=".$a['cid']."'>Edit</a>
                                        <a href='cdelete.php?id=".$a['cid']."' class='delete'>Delete</a>
                                    </td>
                                </tr>";
                        } 
                        ?>
                    </tbody>
                </table>
            </div>
            
            <div class="add">
                <h1>Add Level</h1>
                <div class="info">
                    <span>Class Level<sup>*</sup></span>
                    <input type="text" name="name" required>
                    
                    <span>Class Code<sup>*</sup></span>
                    <input type="text" name="code" required>
                    
                    <button name="create">Add</button>
                </div>    
            </div>
        </div>
    </form>
    
    <?php
    if (isset($_POST['create'])) {
        $name = $_POST['name'];
        $code = $_POST['code'];
        $insert = mysqli_query($conn, "insert into class(level, class_code) values('$name', '$code')");
        if ($insert == true) {
            echo "<script>alert('Class registered'),location='class.php'</script>";
        }
    }
    ?>
</body> 
</html>