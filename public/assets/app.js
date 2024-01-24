function showToast(message, isSuccess = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = isSuccess ? "toast toast-success" : "toast toast-error";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function handleFileSelect(event) {
    event.stopPropagation();
    event.preventDefault();

    var file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];
    var fileNameWithoutExtension = file.name.replace(/\..+$/, '');

    if (file.name.split('.').pop().toLowerCase() !== 'jspf') {
        showToast('Error: Only JSPF files are supported');
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(event) {
        var jspfData = JSON.parse(event.target.result);
        var outputData;
        var outputExtension;

        if (document.getElementById('formatToggle').checked) {
            outputData = convertJSPFtoXSPF(jspfData);
            outputExtension = 'xspf';
        } else {
            outputData = convertJSPFtoM3U(jspfData);
            outputExtension = 'm3u';
        }

        if (outputData) {
            downloadFile(outputData, fileNameWithoutExtension, outputExtension);
        } else {
            showToast('Error: Invalid file format');
        }
    };
    reader.readAsText(file);
}

function convertJSPFtoM3U(jspfData) {
    if (!jspfData || !jspfData.playlist || !Array.isArray(jspfData.playlist.track)) {
        console.error('Invalid JSPF data');
        return '';
    }

    let m3uContent = "#EXTM3U\n";
    jspfData.playlist.track.forEach(track => {
        if (track.title && track.creator) {
            m3uContent += `#EXTINF:-1,${track.creator} - ${track.title}\n`;
            m3uContent += `${track.identifier}\n`;
        }
    });

    showToast("Conversion to M3U successful!", true);
    return m3uContent;
}

function convertJSPFtoXSPF(jspfData) {
    if (!jspfData || !jspfData.playlist) {
        console.error('Invalid JSPF data');
        return '';
    }

    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlString += '<playlist version="0" xmlns="http://xspf.org/ns/0/">\n';
    xmlString += '<trackList>\n';

    jspfData.playlist.track.forEach(track => {
        xmlString += '<track>\n';

        if (track.title) {
            xmlString += `<title>${escapeXML(track.title)}</title>\n`;
        }

        if (track.creator) {
            xmlString += `<creator>${escapeXML(track.creator)}</creator>\n`;
        }

        if (track.identifier) {
            xmlString += `<location>${escapeXML(track.identifier)}</location>\n`;
        }

        xmlString += '</track>\n';
    });

    xmlString += '</trackList>\n';
    xmlString += '</playlist>';

    showToast("Conversion to XSPF successful!", true);
    return xmlString;
}

function escapeXML(str) {
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function downloadFile(data, fileNameWithoutExtension, extension) {
    var blob = new Blob([data], { type: "text/plain" });
    var url = window.URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = `${fileNameWithoutExtension}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
}

var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', function(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', handleFileSelect);
document.getElementById('file_input').addEventListener('change', handleFileSelect);

document.getElementById('formatToggle').addEventListener('change', function() {
    if (this.checked) {
        document.getElementById('formatLabel').textContent = 'Convert to XSPF';
    } else {
        document.getElementById('formatLabel').textContent = 'Convert to M3U';
    }
});
