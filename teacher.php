<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Management</title>
    <style>
        :root {
            --primary-color: #3498db;
            --success-color: #2ecc71;
            --danger-color: #e74c3c;
            --text-color: #2c3e50;
            --border-color: #ecf0f1;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }
        
        * {
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: #f8f9fa;
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .cont {
            width: 100%;
            min-height: 100vh;
            padding: 15px;
            display: flex;
            flex-direction: column;
        }
        
        h1 {
            text-align: center;
            margin: 15px 0;
            color: var(--text-color);
            font-size: 1.5rem;
        }
        
        .old {
            width: 100%;
            margin-bottom: 20px;
            overflow-x: auto;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 5px var(--shadow-color);
            padding: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
            font-size: 0.9rem;
        }
        
        th, td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background-color: var(--primary-color);
            color: white;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        tr:hover {
            background-color: #f8f9fa;
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        a {
            display: inline-block;
            padding: 4px 8px;
            text-decoration: none;
            font-size: 0.75rem;
            font-weight: bold;
            border-radius: 3px;
            transition: all 0.2s ease;
        }
        
        a.edit {
            background-color: var(--primary-color);
            color: white;
        }
        
        a.delete {
            background-color: var(--danger-color);
            color: white;
        }
        
        a:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .add {
            width: 100%;
            background: white;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 1px 5px var(--shadow-color);
            margin-bottom: 20px;
        }
        
        .info {
            width: 100%;
            max-width: 500px;
            margin: 0 auto;
        }
        
        .info span {
            display: block;
            text-align: left;
            margin: 10px 0 3px;
            font-weight: 600;
            color: var(--text-color);
            font-size: 0.9rem;
        }
        
        sup {
            color: var(--danger-color);
        }
        
        .info input {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 3px;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        
        button {
            width: 100%;
            padding: 8px;
            background-color: var(--success-color);
            color: white;
            border: none;
            border-radius: 3px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
            margin-top: 15px;
        }
        
        @media (min-width: 992px) {
            .cont {
                flex-direction: row;
                gap: 20px;
                padding: 20px;
            }
            
            .old {
                width: 60%;
                margin-bottom: 0;
            }
            
            .add {
                width: 40%;
                position: sticky;
                top: 15px;
            }
        }
    </style>
</head>
<body>
    <form action="" method="POST">
        <div class="cont">
            <div class="old">
                <h1>Teachers List</h1>
                <table>
                    <thead>
                        <tr>
                            <td>N<sup><u>o</u></sup></td>
                            <th>Code</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        include("connection.php");
                        $select = mysqli_query($conn, "SELECT * FROM teacher");
                        $c = 0;
                        while ($a = mysqli_fetch_array($select)) {
                            $c++;
                            echo "<tr>
                                    <td>".$c."</td>
                                    <td>".$a['tcode']."</td>
                                    <td>".$a['fname']."</td>
                                    <td>".$a['lname']."</td>
                                    <td>
                                        <div class='action-buttons'>
                                            <a href='tupdate.php?id=".$a['tid']."' class='edit'>Edit</a>
                                            <a href='tdelete.php?id=".$a['tid']."' class='delete'>Delete</a>
                                        </div>
                                    </td>
                                </tr>";
                        }
                        ?>
                    </tbody>
                </table>
            </div>
            
            <div class="add">
                <h1>Add Teacher</h1>
                <div class="info" id="info">
                    <span>First name <sup>*</sup></span>
                    <input type="text" name="fname" required>
                    
                    <span>Last Name <sup>*</sup></span>
                    <input type="text" name="lname" required>
                    
                    <span>Code <sup>*</sup></span>
                    <input type="text" name="code" required>
                    
                    <button name="create" id="save">Register</button>
                </div>
            </div>
        </div>
    </form>
    
    <?php
    if (isset($_POST['create'])) {
        $fname = mysqli_real_escape_string($conn, $_POST['fname']);
        $lname = mysqli_real_escape_string($conn, $_POST['lname']);
        $code = mysqli_real_escape_string($conn, $_POST['code']);
        
        $insert = mysqli_query($conn, "INSERT INTO teacher(fname, lname, tcode) VALUES('$fname', '$lname', '$code')");
        
        if ($insert) {
            echo "<script>
                    alert('Teacher registered successfully');
                    window.location.href = 'teacher.php';
                  </script>";
        }
    }
    ?>
</body> 
</html>