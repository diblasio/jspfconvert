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
    reader.onload = function (event) {
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
            xmlString += `<title>${escapeXML(String(track.title))}</title>\n`;
        }

        if (track.creator) {
            xmlString += `<creator>${escapeXML(String(track.creator))}</creator>\n`;
        }

        if (track.identifier) {
            xmlString += `<location>${escapeXML(String(track.identifier))}</location>\n`;
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
    extension = extension || 'txt'; // Default to .txt if extension is not defined
    a.download = `${fileNameWithoutExtension}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
}

var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', function (event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', handleFileSelect);
document.getElementById('file_input').addEventListener('change', handleFileSelect);

document.getElementById('formatToggle').addEventListener('change', function () {
    if (this.checked) {
        document.getElementById('formatLabel').textContent = 'Convert to XSPF';
    } else {
        document.getElementById('formatLabel').textContent = 'Convert to M3U';
    }
});

function fetchPlaylistsForUser() {
    const username = document.getElementById('username_input').value.trim();
    if (!username) {
        showToast('Please enter a ListenBrainz username.', false);
        return;
    }

    // ListenBrainz API endpoint to fetch user's playlists
    const url = `https://api.listenbrainz.org/1/user/${encodeURIComponent(username)}/playlists`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            console.log('Playlists returned:', data.playlists); // Log the list of playlists

            const playlistsDropdown = document.getElementById('playlists_dropdown');
            playlistsDropdown.innerHTML = ''; // Clear previous options

            if (data && data.playlists && data.playlists.length > 0) {
                data.playlists.forEach(item => {
                    // Ensure the playlist object and title field exist
                    if (item.playlist && item.playlist.title) {
                        const option = document.createElement('option');
                        option.value = item.playlist.identifier; // Use playlist identifier as the value
                        option.textContent = item.playlist.title; // Use the playlist title for the dropdown text
                        playlistsDropdown.appendChild(option);
                    }
                });

                // Show the playlists dropdown container
                document.getElementById('playlists_container').style.display = 'block';
            } else {
                showToast('No playlists found for this user.', false);
            }
        })
        .catch(error => {
            showToast(`Error fetching playlists: ${error.message}`, false);
        });
}

function convertAndDownloadPlaylist() {
    const selectedOption = document.getElementById('playlists_dropdown').selectedOptions[0];
    const selectedPlaylistUrl = selectedOption.value;
    const selectedPlaylistTitle = selectedOption.text; // The text of the selected option is the playlist title

    if (!selectedPlaylistUrl) {
        showToast('Please select a playlist', false);
        return;
    }

    const playlistId = selectedPlaylistUrl.split('/').pop();
    const url = `https://api.listenbrainz.org/1/playlist/${playlistId}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            let fileData;
            let fileExtension = document.getElementById('formatToggle').checked ? 'xspf' : 'm3u'; // Set file extension based on the toggle

            if (document.getElementById('formatToggle').checked) {
                fileData = convertJSPFtoXSPF(data);
            } else {
                fileData = convertJSPFtoM3U(data);
            }

            const safeFileName = selectedPlaylistTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            downloadFile(fileData, safeFileName, fileExtension); // Pass the correct extension
        })
        .catch(error => {
            showToast(`Error fetching playlist details: ${error}`, false);
        });
}

// Event listeners
document.getElementById('fetch_playlists').addEventListener('click', fetchPlaylistsForUser);
document.getElementById('convert_playlist').addEventListener('click', convertAndDownloadPlaylist);
