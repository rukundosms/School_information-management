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

// Get classes
$classes_query = mysqli_query($conn, "SELECT * FROM class WHERE tid='$tid'");

// Handle announcement creation
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['create_announcement'])) {
    $cid = $_POST['cid'];
    $title = mysqli_real_escape_string($conn, $_POST['title']);
    $content = mysqli_real_escape_string($conn, $_POST['content']);
    $important = isset($_POST['important']) ? 1 : 0;
    $expires_at = !empty($_POST['expires_at']) ? $_POST['expires_at'] : NULL;
    
    $insert = mysqli_query($conn, "
        INSERT INTO announcements (cid, tid, title, content, important, expires_at) 
        VALUES ('$cid', '$tid', '$title', '$content', '$important', '$expires_at')
    ");
    
    if ($insert) {
        $success = "Announcement posted successfully!";
    } else {
        $error = "Failed to post announcement: " . mysqli_error($conn);
    }
}

// Get all announcements
$announcements_query = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM announcements a
    JOIN class c ON a.cid = c.cid
    WHERE a.tid='$tid'
    ORDER BY a.created_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Announcements</title>
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
        .announcement-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .announcement-important {
            border-left: 4px solid #dc3545;
        }
        .form-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-bullhorn"></i> Announcements
        </h2>
        
        <!-- Create Announcement Form -->
        <div class="form-container">
            <h5>Create New Announcement</h5>
            
            <?php if(isset($success)): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <?php if(isset($error)): ?>
                <div class="alert alert-danger"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <form method="POST">
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
                        <label>Expires On (Optional)</label>
                        <input type="date" name="expires_at" class="form-control">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label>Title *</label>
                    <input type="text" name="title" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label>Content *</label>
                    <textarea name="content" class="form-control" rows="5" required></textarea>
                </div>
                
                <div class="mb-3">
                    <input type="checkbox" name="important" id="important">
                    <label for="important" class="ms-2">Mark as Important</label>
                </div>
                
                <button type="submit" name="create_announcement" class="btn btn-green">
                    <i class="fas fa-paper-plane"></i> Post Announcement
                </button>
            </form>
        </div>
        
        <!-- Announcements List -->
        <h5 class="mb-3">Recent Announcements</h5>
        
        <?php while($announcement = mysqli_fetch_assoc($announcements_query)): ?>
            <div class="announcement-card <?php echo $announcement['important'] ? 'announcement-important' : ''; ?>">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>
                            <?php if($announcement['important']): ?>
                                <span class="badge bg-danger me-2">Important</span>
                            <?php endif; ?>
                            <?php echo htmlspecialchars($announcement['title']); ?>
                        </h5>
                        <small class="text-muted">
                            <i class="fas fa-chalkboard"></i> <?php echo $announcement['class_name']; ?>
                            | <i class="far fa-clock"></i> <?php echo date('M d, Y h:i A', strtotime($announcement['created_at'])); ?>
                            <?php if($announcement['expires_at']): ?>
                                | <i class="fas fa-hourglass-end"></i> Expires: <?php echo date('M d, Y', strtotime($announcement['expires_at'])); ?>
                            <?php endif; ?>
                        </small>
                        <p class="mt-3"><?php echo nl2br(htmlspecialchars($announcement['content'])); ?></p>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
        
        <?php if(mysqli_num_rows($announcements_query) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                <p>No announcements yet.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>