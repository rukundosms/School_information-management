<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Module Management</title>
    <style>
        :root {
            --primary-color: #3498db;
            --danger-color: #e74c3c;
            --success-color: #2ecc71;
            --border-color: #ddd;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }
        
        * {
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: #f5f7fa;
            color: #333;
        }
        
        .cont {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
        }
        
        h1 {
            margin: 15px 0;
            color: #2c3e50;
            font-size: 1.8rem;
            text-align: center;
        }
        
        /* Table Styles */
        .old {
            width: 100%;
            overflow-x: auto;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px var(--shadow-color);
            padding: 15px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            min-width: 600px;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        tr:hover {
            background-color: #f8f9fa;
        }
        
        /* Action Links */
        a {
            display: inline-block;
            padding: 6px 12px;
            margin: 2px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 500;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .edit {
            background-color: var(--primary-color);
            color: white;
        }
        
        .delete {
            background-color: var(--danger-color);
            color: white;
        }
        
        a:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        /* Form Styles */
        .add {
            width: 100%;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px var(--shadow-color);
            padding: 20px;
        }
        
        .info {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
        }
        
        .info span {
            font-weight: 500;
            color: #495057;
        }
        
        .info input, .info select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 0.9rem;
            transition: border 0.3s ease;
        }
        
        .info input:focus, .info select:focus {
            border-color: var(--primary-color);
            outline: none;
        }
        
        button {
            background-color: var(--success-color);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            margin-top: 10px;
        }
        
        button:hover {
            background-color: #27ae60;
            transform: translateY(-1px);
        }
        
        /* Responsive Layout */
        @media (min-width: 992px) {
            .cont {
                flex-direction: row;
                gap: 20px;
                align-items: flex-start;
            }
            
            .old {
                width: 70%;
                margin-bottom: 0;
            }
            
            .add {
                width: 30%;
                position: sticky;
                top: 20px;
            }
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 1.5rem;
            }
            
            th, td {
                padding: 8px 10px;
                font-size: 0.8rem;
            }
            
            a {
                padding: 4px 8px;
                font-size: 0.7rem;
            }
        }
    </style>
</head>
<body>
    <form action="" method="POST">
        <div class="cont">
            <div class="old">
                <h1>Modules</h1>
                <table>
                    <thead>
                        <tr>
                            <th>N<sup><u>o</u></sup></th>
                            <th>Module Name</th>
                            <th>Module Code</th>
                            <th>Credits</th>
                            <th>Module Type</th>
                            <th>Class</th>
                            <th>Option</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        include("connection.php");
                        $select = mysqli_query($conn, "SELECT DISTINCT module.mname, class.level,class.class_name, module.mcode, 
                            module.module_type, module.credit, module.class, module.moid, class.cid 
                            FROM class, module WHERE class.cid = module.class");
                        $no = 0;
                        while ($a = mysqli_fetch_array($select)) {
                            $no++;
                            echo "<tr>
                                <td>".$no."</td>
                                <td>".htmlspecialchars($a['mname'])."</td>
                                <td>".htmlspecialchars($a['mcode'])."</td>
                                <td>".htmlspecialchars($a['credit'])."</td>
                                <td>".htmlspecialchars($a['module_type'])."</td>
                                <td>".htmlspecialchars($a['level'])."".htmlspecialchars($a['class_name'])."</td>
                                <td>
                                    <a href='mupdate.php?id=".$a['moid']."' class='edit'>Edit</a>
                                    <a href='mdelete.php?id=".$a['moid']."' class='delete'>Delete</a>
                                </td>
                            </tr>";
                        } 
                        ?>
                    </tbody>
                </table>
            </div>
            
            <div class="add">
                <h1>Add Module</h1>
                <div class="info">
                    <div>
                        <span>Module Name<sup>*</sup></span>
                        <input type="text" name="name" required>
                    </div>
                    
                    <div>
                        <span>Module Code<sup>*</sup></span>
                        <input type="text" name="code" required>
                    </div>
                    
                    <div>
                        <span>Credit<sup>*</sup></span>
                        <input type="text" name="credit" required>
                    </div>
                    
                    <div>
                        <span>Module Type<sup>*</sup></span>
                        <select name="type" required>
                            <option value="complementary">Complementary</option>
                            <option value="general">General</option>
                            <option value="specific">Specific</option>
                        </select>
                    </div>
                    
                    <div>
                        <span>Class<sup>*</sup></span>
                        <select name="class" required>
                            <option value="" selected disabled>Select level</option>
                            <?php
                            $select = mysqli_query($conn, "SELECT * FROM class");
                            while ($a = mysqli_fetch_array($select)) {
                                echo "<option value='".$a['cid']."'>".htmlspecialchars($a['level'])."".htmlspecialchars($a['class_name'])."</option>";
                            } 
                            ?>
                        </select>
                    </div>
                    
                    <button type="submit" name="create">Add Module</button>
                </div>
            </div>
        </div>
    </form>
    
    <?php
    if (isset($_POST['create'])) {
        $name = mysqli_real_escape_string($conn, $_POST['name']);
        $class = mysqli_real_escape_string($conn, $_POST['class']);
        $code = mysqli_real_escape_string($conn, $_POST['code']);
        $type = mysqli_real_escape_string($conn, $_POST['type']);
        $credit = mysqli_real_escape_string($conn, $_POST['credit']);
        
        $insert = mysqli_query($conn, "INSERT INTO module (class, mname, mcode, module_type, credit) 
            VALUES ('$class', '$name', '$code', '$type', '$credit')");
            
        if ($insert) {
            echo "<script>alert('Module registered successfully'); location.href='module.php';</script>";
        } else {
            echo "<script>alert('Error: ".mysqli_error($conn)."');</script>";
        }
    }
    ?>
</body>
</html>