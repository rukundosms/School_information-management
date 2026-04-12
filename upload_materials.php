<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = $_SESSION['tcode'];
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Create uploads directory if not exists
$upload_dir = "uploads/materials/";
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Get classes
$classes_query = mysqli_query($conn, "SELECT * FROM class WHERE tid='$tid'");

// Handle file upload
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['upload_material'])) {
    $cid = $_POST['cid'];
    $title = mysqli_real_escape_string($conn, $_POST['title']);
    $description = mysqli_real_escape_string($conn, $_POST['description']);
    $material_type = $_POST['material_type'];
    
    $file_name = $_FILES['file']['name'];
    $file_tmp = $_FILES['file']['tmp_name'];
    $file_size = $_FILES['file']['size'];
    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    
    $allowed_ext = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4', 'zip'];
    
    if (in_array($file_ext, $allowed_ext)) {
        $new_filename = time() . "_" . preg_replace('/[^a-zA-Z0-9.]/', '_', $file_name);
        $file_path = $upload_dir . $new_filename;
        
        if (move_uploaded_file($file_tmp, $file_path)) {
            $insert = mysqli_query($conn, "
                INSERT INTO study_materials (cid, tid, title, description, material_type, file_path, file_name, file_size) 
                VALUES ('$cid', '$tid', '$title', '$description', '$material_type', '$file_path', '$new_filename', '$file_size')
            ");
            
            if ($insert) {
                $success = "Material uploaded successfully!";
            } else {
                $error = "Failed to save to database: " . mysqli_error($conn);
            }
        } else {
            $error = "Failed to upload file.";
        }
    } else {
        $error = "File type not allowed. Allowed types: " . implode(', ', $allowed_ext);
    }
}

// Get uploaded materials
$materials_query = mysqli_query($conn, "
    SELECT m.*, c.class_name 
    FROM study_materials m
    JOIN class c ON m.cid = c.cid
    WHERE m.tid='$tid'
    ORDER BY m.uploaded_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Materials</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .form-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .material-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .file-icon {
            font-size: 2rem;
            color: rgb(8, 58, 8);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-cloud-upload-alt"></i> Upload Study Materials
        </h2>
        
        <!-- Upload Form -->
        <div class="form-container">
            <h5>Upload New Material</h5>
            
            <?php if(isset($success)): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <?php if(isset($error)): ?>
                <div class="alert alert-danger"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <form method="POST" enctype="multipart/form-data">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>Select Class *</label>
                        <select name="cid" class="form-control" required>
                            <option value="">Select Class</option>
                            <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
                                <option value="<?php echo $class['cid']; ?>">
                                    <?php echo htmlspecialchars($class['class_name']); ?>
                                </option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Material Type *</label>
                        <select name="material_type" class="form-control" required>
                            <option value="lecture">Lecture Notes</option>
                            <option value="assignment">Assignment</option>
                            <option value="reading">Reading Material</option>
                            <option value="video">Video</option>
                            <option value="presentation">Presentation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label>Title *</label>
                    <input type="text" name="title" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label>Description</label>
                    <textarea name="description" class="form-control" rows="3"></textarea>
                </div>
                
                <div class="mb-3">
                    <label>Select File *</label>
                    <input type="file" name="file" class="form-control" required>
                    <small class="text-muted">Allowed: PDF, DOC, PPT, XLS, JPG, PNG, MP4, ZIP (Max 50MB)</small>
                </div>
                
                <button type="submit" name="upload_material" class="btn btn-green">
                    <i class="fas fa-upload"></i> Upload Material
                </button>
            </form>
        </div>
        
        <!-- Materials List -->
        <h5 class="mb-3">Uploaded Materials</h5>
        
        <?php while($material = mysqli_fetch_assoc($materials_query)): ?>
            <div class="material-card">
                <div class="row align-items-center">
                    <div class="col-md-1 text-center">
                        <?php
                        $icon = 'fa-file';
                        if (strpos($material['file_path'], '.pdf') !== false) $icon = 'fa-file-pdf';
                        elseif (strpos($material['file_path'], '.doc') !== false) $icon = 'fa-file-word';
                        elseif (strpos($material['file_path'], '.ppt') !== false) $icon = 'fa-file-powerpoint';
                        elseif (strpos($material['file_path'], '.xls') !== false) $icon = 'fa-file-excel';
                        elseif (strpos($material['file_path'], '.jpg') !== false || strpos($material['file_path'], '.png') !== false) $icon = 'fa-file-image';
                        elseif (strpos($material['file_path'], '.mp4') !== false) $icon = 'fa-file-video';
                        ?>
                        <i class="fas <?php echo $icon; ?> file-icon"></i>
                    </div>
                    <div class="col-md-5">
                        <h6 class="mb-1"><?php echo htmlspecialchars($material['title']); ?></h6>
                        <small class="text-muted">
                            <i class="fas fa-chalkboard"></i> <?php echo $material['class_name']; ?>
                            <br>
                            <?php echo htmlspecialchars($material['description']); ?>
                        </small>
                    </div>
                    <div class="col-md-3">
                        <small class="text-muted">
                            <i class="fas fa-tag"></i> <?php echo ucfirst($material['material_type']); ?>
                            <br>
                            <i class="far fa-clock"></i> <?php echo date('M d, Y', strtotime($material['uploaded_at'])); ?>
                        </small>
                    </div>
                    <div class="col-md-3 text-end">
                        <a href="<?php echo $material['file_path']; ?>" target="_blank" class="btn btn-sm btn-green">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
        
        <?php if(mysqli_num_rows($materials_query) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                <p>No materials uploaded yet.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>