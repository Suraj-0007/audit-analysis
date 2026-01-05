"""Evidence bundle zip creation."""

import os
import zipfile
from io import BytesIO
from typing import List, Optional

from app.core.logging import get_logger

logger = get_logger(__name__)


def create_evidence_zip(
    artifacts_dir: str,
    pdf_path: Optional[str] = None,
    screenshots: Optional[List[str]] = None,
) -> bytes:
    """
    Create a zip file containing all audit evidence.
    
    Args:
        artifacts_dir: Directory containing audit artifacts
        pdf_path: Optional path to PDF report
        screenshots: Optional list of screenshot paths
    
    Returns:
        Zip file as bytes
    """
    buffer = BytesIO()
    
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add PDF report if exists
        if pdf_path and os.path.exists(pdf_path):
            zf.write(pdf_path, "report.pdf")
        
        # Add screenshots
        if screenshots:
            for i, screenshot_path in enumerate(screenshots):
                if os.path.exists(screenshot_path):
                    filename = os.path.basename(screenshot_path)
                    zf.write(screenshot_path, f"screenshots/{filename}")
        
        # Add any other files in artifacts directory
        if os.path.exists(artifacts_dir):
            for root, dirs, files in os.walk(artifacts_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Get relative path
                    arcname = os.path.relpath(file_path, artifacts_dir)
                    # Skip if already added
                    if arcname not in zf.namelist():
                        zf.write(file_path, arcname)
    
    buffer.seek(0)
    return buffer.read()


def save_evidence_zip(
    artifacts_dir: str,
    output_path: str,
    pdf_path: Optional[str] = None,
    screenshots: Optional[List[str]] = None,
) -> str:
    """
    Create and save evidence zip file.
    
    Returns:
        Path to saved zip file
    """
    zip_bytes = create_evidence_zip(artifacts_dir, pdf_path, screenshots)
    
    with open(output_path, 'wb') as f:
        f.write(zip_bytes)
    
    logger.info(f"Evidence bundle saved to {output_path}")
    return output_path
