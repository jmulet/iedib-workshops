(function () {
    var isQuizz = document.body.id === 'page-mod-quiz-attempt';
    var url = new URL(window.location.href);
    var attempt = url.searchParams.get('attempt');
    var cmid = url.searchParams.get('cmid');

    // Construct new URL keeping only 'attempt' and 'cmid' if they exist
    var newParams = new URLSearchParams();
    if (attempt) {
        newParams.set('attempt', attempt);
    }
    if (cmid) {
        newParams.set('cmid', cmid);
    }

    var queryString = newParams.toString();
    var href = url.origin + url.pathname + (queryString ? '?' + queryString : '');
    var userId = -1;

    // Safety check for Moodle global config properties
    if (typeof M !== 'undefined' && M.cfg) {
        userId = M.cfg.userId || M.cfg.userid || -1;
    }

    var storage = localStorage.getItem('ib-snptd-audioexam') || '[]';
    var auditions = [];
    try {
        auditions = JSON.parse(storage) || [];
    } catch (e) {
        auditions = [];
    }

    function processElement(el) {
        if (el.dataset.active === '1') {
            return;
        }
        el.dataset.active = '1';

        var playOnce = el.dataset.once !== 'false';
        var src = el.dataset.src;
        var playBtn = el.querySelector('button');

        if (!src || !playBtn) {
            console.error("Audio-exam: Button and src elements are required.");
            return;
        }

        playBtn.disabled = false;

        // Element state selections
        var audioIdle = el.querySelector('.ib-audio-idle');
        var audioPlaying = el.querySelector('.ib-audio-playing');
        var audioEnded = el.querySelector('.ib-audio-ended');

        var progressbar = el.querySelector('progress');
        var bsProgressBar = el.querySelector('.progress-bar');
        var bsProgressContainer = el.querySelector('.progress');

        // Helper to update progress visuals seamlessly
        function setProgress(percent, isVisible) {
            // HTML5 <progress>
            if (progressbar) {
                progressbar.value = percent;
                if (isVisible) {
                    progressbar.classList.remove('d-none');
                } else {
                    progressbar.classList.add('d-none');
                }
            }
            // Bootstrap Progress Bar <div>
            if (bsProgressBar) {
                bsProgressBar.style.width = percent + '%';
                bsProgressBar.setAttribute('aria-valuenow', Math.round(percent));
            }
            if (bsProgressContainer) {
                if (isVisible) {
                    bsProgressContainer.classList.remove('d-none');
                } else {
                    bsProgressContainer.classList.add('d-none');
                }
            }
        }

        const playAudio = function (evt) {
            evt.preventDefault();
            playBtn.disabled = true;

            var audio = new Audio(src);

            audio.play().then(function () {
                playBtn.style.display = 'none';
                el.classList.add('audio-playing-active');

                // Hide idle & ended, show playing
                if (audioIdle) {
                    audioIdle.classList.add('d-none');
                }
                if (audioPlaying) {
                    audioPlaying.classList.remove('d-none');
                }
                if (audioEnded) {
                    audioEnded.classList.add('d-none');
                }

                setProgress(0, true);

            }).catch(function (err) {
                console.error('Cannot play audio', err);
                playBtn.disabled = false;
                playBtn.classList.remove('btn-primary');
                playBtn.classList.add('btn-danger');
                playBtn.style.display = '';
                el.classList.remove('audio-playing-active');

                // Revert to idle on playback error
                if (audioIdle) {
                    audioIdle.classList.remove('d-none');
                }
                if (audioPlaying) {
                    audioPlaying.classList.add('d-none');
                }
                if (audioEnded) {
                    audioEnded.classList.add('d-none');
                }

                setProgress(0, false);
                alert('Audio playback error: ' + (err.message || err));
            });

            audio.addEventListener('ended', function () {
                el.classList.remove('audio-playing-active');
                el.classList.add('audio-completed');

                if (playOnce) {
                    playBtn.removeEventListener('click', playAudio);
                    playBtn.remove();

                    // Store that audio has been played by user
                    var key = userId + ":" + href + ":" + src;
                    if (isQuizz && auditions.indexOf(key) === -1) {
                        auditions.push(key);
                        localStorage.setItem('ib-snptd-audioexam', JSON.stringify(auditions));
                    }
                } else {
                    playBtn.disabled = false;
                    playBtn.style.display = '';
                }

                // Hide idle & playing, show ended
                if (audioIdle) {
                    audioIdle.classList.add('d-none');
                }
                if (audioPlaying) {
                    audioPlaying.classList.add('d-none');
                }
                if (audioEnded) {
                    audioEnded.classList.remove('d-none');
                }

                setProgress(100, false);
            });

            // Handle time updates during playback
            audio.addEventListener('timeupdate', function () {
                if (audio.duration) {
                    var percent = (audio.currentTime / audio.duration) * 100;
                    setProgress(percent, true);
                }
            });
        };

        if (playOnce) {
            // Check if already played
            var key = userId + ":" + href + ":" + src;
            var alreadyPlayed = auditions.indexOf(key) !== -1;

            if (alreadyPlayed) {
                playBtn.remove();
                el.classList.add('audio-completed');

                if (audioIdle) {
                    audioIdle.classList.add('d-none');
                }
                if (audioPlaying) {
                    audioPlaying.classList.add('d-none');
                }
                if (audioEnded) {
                    audioEnded.classList.remove('d-none');
                }
                if (progressbar) {
                    progressbar.classList.add('d-none');
                }
                if (bsProgressContainer) {
                    bsProgressContainer.classList.add('d-none');
                }
                return;
            }
        }

        playBtn.addEventListener('click', playAudio);
    }

    var elements = document.querySelectorAll('div[data-snptd="audio-exam"]');
    for (var i = 0; i < elements.length; i++) {
        processElement(elements[i]);
    }

})();