(function () {

    if (!window.iedibAPI) {
        console.error("REQUIRES iedibAPI loaded in page");
    }

    var pageInfo = (window.iedibAPI && window.iedibAPI.getPageInfo()) || {};
    pageInfo.rank_name = "game_cards_geo_1bat";

    var reflowLatex = function () {
        if (window.MathJax) {
            if (window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise();
            } else if (window.MathJax.Hub && window.MathJax.Hub.Queue) {
                window.MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            }
        }
    };

    var pad2 = function (e) {
        if (e < 10) {
            return "0" + e;
        }
        return e;
    };

    var bl = "\\" + "(";
    var el = "\\" + ")";

    var turns = 0;
    var girsEl = document.getElementById("voltes");
    var cronoEl = document.getElementById("comptador");
    if (girsEl) girsEl.innerHTML = "&nbsp;" + turns + "&nbsp;";

    var confetti = null;
    var cronoInterval = null;

    var Memory = {

        init: function (cards) {
            var self = this;
            this.gameEl = document.querySelector(".fc_game");
            this.modalEl = document.querySelector(".modal");
            this.overlayEl = document.querySelector(".modal-overlay");
            this.restartButton = document.querySelector("button.restart");
            if (this.restartButton) this.restartButton.style.display = 'none';

            this.startButton = document.querySelector("button.start");
            if (this.startButton) {
                this.startButton.addEventListener("click", function (e) {
                    self.onGameStart(e);
                });
            }

            this.allCards = cards;
            this.cardsArray = cards;
            this.playing = false;
            this.seconds = 0;
            this.shuffleCards();
            this.setup();
        },

        shuffleCards: function () {
            // Limit to 6 pairs (as per existing logic in shuffleCards)
            var pairsCount = this.allCards.length / 2;
            var ids = [];
            for (var i = 1; i <= pairsCount; i++) {
                ids.push(i);
            }
            ids = this.shuffle(ids);

            this.cardsArray = [];
            for (var i = 0; i < 6; i++) {
                var id = ids[i];
                for (var j = 0; j < this.allCards.length; j++) {
                    var ca = this.allCards[j];
                    if (ca.id == id) {
                        this.cardsArray.push(ca);
                    }
                }
            }
            this.cardsArray = this.shuffle(this.cardsArray);
        },

        setup: function () {
            if (this.gameEl) {
                this.gameEl.innerHTML = this.buildHTML();
            }
            reflowLatex();

            this.paused = false;
            this.guess = null;
            this.binding();

            // calls the update UI ranking
            this.listRanking();
        },

        binding: function () {
            var self = this;
            var cardElements = document.querySelectorAll(".carta");
            for (var i = 0; i < cardElements.length; i++) {
                cardElements[i].addEventListener("click", function (e) {
                    self.cardClicked(this);
                });
            }

            if (this.restartButton) {
                this.restartButton.addEventListener("click", function (e) {
                    self.reset(e);
                });
            }
        },

        showModal: function (id) {
            var feedback = "";
            var enunciat = "";
            var solucio = "";
            for (var i = 0, len = this.cardsArray.length; i < len; i++) {
                var ca = this.cardsArray[i];
                if (ca.id == id && ca.feed) {
                    feedback = ca.feed || "";
                    enunciat = ca.desc || "";
                }
                if (ca.id == id && !ca.feed) {
                    solucio = ca.desc || "";
                }
            }

            if (feedback) {
                var eModal = document.getElementById('enunciat_modal');
                var rModal = document.getElementById('retroaccio_modal');
                var sModal = document.getElementById('solucio_modal');
                if (eModal) eModal.innerHTML = enunciat;
                if (rModal) rModal.innerHTML = feedback;
                if (sModal) sModal.innerHTML = solucio;

                reflowLatex();

                // Vanilla Bootstrap Modal Trigger
                var modal = document.getElementById('exampleModal');
                if (modal) {
                    if (window.bootstrap && window.bootstrap.Modal) {
                        var modalInst = bootstrap.Modal.getOrCreateInstance(modal);
                        modalInst.show();
                    } else {
                        // Fallback simple toggle if no bootstrap.js
                        modal.classList.add('show');
                        modal.style.display = 'block';
                        document.body.classList.add('modal-open');
                    }
                }
            }
        },

        cardClicked: function (cardEl) {
            if (!this.playing || this.paused) {
                return;
            }

            var inside = cardEl.querySelector(".inside");
            if (inside.classList.contains("matched") || inside.classList.contains("picked")) {
                return;
            }

            inside.classList.add("picked");

            if (!this.guess) {
                // First card selected
                this.guess = cardEl;
                turns += 1;
                if (girsEl) girsEl.innerHTML = "" + turns + "&nbsp;";
            } else {
                // Second card selected
                if (this.guess.getAttribute("data-id") == cardEl.getAttribute("data-id") && this.guess !== cardEl) {
                    var pickedEls = document.querySelectorAll(".inside.picked");
                    for (var i = 0; i < pickedEls.length; i++) {
                        pickedEls[i].classList.add("matched");
                    }
                    var id = this.guess.getAttribute("data-id");
                    this.showModal(id);
                    this.guess = null;
                } else {
                    this.guess = null;
                    this.paused = true;
                    var self = this;
                    setTimeout(function () {
                        var pickedEls = document.querySelectorAll(".inside.picked:not(.matched)");
                        for (var i = 0; i < pickedEls.length; i++) {
                            pickedEls[i].classList.remove("picked");
                        }
                        self.paused = false;
                    }, 600);
                }
            }

            var allCards = document.querySelectorAll(".carta");
            var matchedCards = document.querySelectorAll(".inside.matched");
            if (matchedCards.length === allCards.length && allCards.length > 0) {
                this.win();
            }
        },

        win: function () {
            var self = this;
            this.paused = true;
            if (!confetti && window.Confetti) {
                var container = document.querySelector(".fc_wrap");
                confetti = new window.Confetti(container);
            }
            if (confetti) {
                confetti.play();
            }
            setTimeout(function () {
                if (self.restartButton) self.restartButton.style.display = 'none';
                if (self.startButton) self.startButton.style.display = 'block';

                if (cronoInterval) {
                    clearInterval(cronoInterval);
                    cronoInterval = null;

                    var score = 10000 - 500 * turns;
                    if (score < 0) score = 0;
                    score = Math.floor(score * (300 / (self.seconds + 1)));

                    var misc = JSON.stringify({ seconds: self.seconds, girs: turns });
                    var payload = JSON.parse(JSON.stringify(pageInfo));
                    payload.rank_misc = misc;
                    payload.rank_score = score;

                    self.updateRanking(payload);
                    self.seconds = 0;
                    turns = 0;
                }
                if (cronoEl) cronoEl.innerHTML = "";
                self.reset();
            }, 1000);
        },

        updateRanking: function (payload) {
            var self = this;
            var body = "";
            for (var key in payload) {
                if (body) body += "&";
                body += encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]);
            }

            fetch("https://ibsuite.es/iedibapi/ranking/update", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: body
            })
                .then(function (res) { return res.json(); })
                .then(function (datos) {
                    console.log(datos);
                    self.listRanking();
                })
                .catch(function (err) {
                    console.error(err);
                });
        },

        listRanking: function () {
            var self = this;
            var body = "";
            for (var key in pageInfo) {
                if (body) body += "&";
                body += encodeURIComponent(key) + "=" + encodeURIComponent(pageInfo[key]);
            }

            fetch("https://ibsuite.es/iedibapi/ranking/list", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: body
            })
                .then(function (res) { return res.json(); })
                .then(function (datos) {
                    if (Array.isArray(datos)) {
                        var filtered = [];
                        for (var k = 0; k < datos.length; k++) {
                            if (datos[k].rank_score > 0) {
                                filtered.push(datos[k]);
                            }
                        }
                        datos = filtered;

                        var first = document.getElementById('first_person');
                        var second = document.getElementById('second_person');
                        var third = document.getElementById('third_person');
                        var you = document.getElementById('you_person');

                        if (datos.length > 0 && first) {
                            first.innerHTML = datos[0].full_name;
                            first.setAttribute('title', datos[0].rank_score + ' punts');
                        }
                        if (second) {
                            if (datos.length > 1) {
                                second.innerHTML = datos[1].full_name;
                                second.setAttribute('title', datos[1].rank_score + ' punts');
                            } else {
                                second.innerHTML = '----------------------';
                            }
                        }
                        if (third) {
                            if (datos.length > 2) {
                                third.innerHTML = datos[2].full_name;
                                third.setAttribute('title', datos[2].rank_score + ' punts');
                            } else {
                                third.innerHTML = '----------------------';
                            }
                        }

                        var pos = -1;
                        for (var i = 0; i < datos.length; i++) {
                            if (pageInfo.userFullname == datos[i].full_name) {
                                pos = i + 1;
                                break;
                            }
                        }
                        if (pos > 3 && you) {
                            you.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Estàs en posició ' + pos + 'a.';
                        } else if (you) {
                            you.innerHTML = '';
                        }

                    } else {
                        console.error(datos);
                    }
                })
                .catch(function (err) {
                    console.error(err);
                });
        },

        onGameStart: function (ev) {
            var self = this;
            if (cronoInterval != null) {
                clearInterval(cronoInterval);
            }
            this.seconds = 0;
            cronoInterval = window.setInterval(function () {
                self.seconds += 1;
                var totalSeconds = self.seconds;
                var hours = Math.floor(totalSeconds / 3600);
                totalSeconds %= 3600;
                var minutes = Math.floor(totalSeconds / 60);
                var seconds = totalSeconds % 60;
                if (cronoEl) cronoEl.innerHTML = pad2(hours) + ":" + pad2(minutes) + ":" + pad2(seconds);
            }, 1000);

            if (this.startButton) this.startButton.style.display = 'none';
            var pickedEls = document.querySelectorAll(".carta > .inside.picked");
            for (var i = 0; i < pickedEls.length; i++) {
                pickedEls[i].classList.remove('picked');
            }
            this.playing = true;
            if (this.restartButton) this.restartButton.style.display = 'block';
        },

        reset: function (ev) {
            if (ev && ev.preventDefault) {
                ev.preventDefault();
            }
            if (this.restartButton) this.restartButton.style.display = 'none';
            if (this.startButton) this.startButton.style.display = 'block';

            if (cronoInterval != null) {
                clearInterval(cronoInterval);
            }
            this.seconds = 0;
            turns = 0;
            if (cronoEl) cronoEl.innerHTML = "";
            if (girsEl) girsEl.innerHTML = "&nbsp;" + turns + "&nbsp;";

            this.shuffleCards();
            this.setup();

            if (this.gameEl) {
                this.gameEl.style.display = 'block';
                // Note: jQuery's "slow" show isn't perfectly matched, but display block is the functional part.
            }
        },

        shuffle: function (array) {
            var counter = array.length, temp, index;
            while (counter > 0) {
                index = Math.floor(Math.random() * counter);
                counter--;
                temp = array[counter];
                array[counter] = array[index];
                array[index] = temp;
            }
            return array;
        },

        buildHTML: function () {
            turns = 0;
            if (girsEl) girsEl.innerHTML = "&nbsp;" + turns + "&nbsp;";
            var frag = '';
            for (var i = 0; i < this.cardsArray.length; i++) {
                var v = this.cardsArray[i];
                frag += '<div class="carta" data-id="' + v.id + '"><div class="inside picked">\
               <div class="back">'+ v.desc + '</div>\
               <div class="front"><img src="https://ibsuite.es/iedib/img/IEDIB.png"\
               alt="IEDIB" /></div></div>\
               </div>';
            }
            return frag;
        }
    };

    var cards = [
        {
            id: 1,
            desc: "Una recta que té pendent " + bl + "2" + el + " i que passa pel punt " + bl + "(-1, -1)" + el,
            feed: "Si sabem un punt i el pendent, podem escriure l'equació punt-pendent " + bl + "y+1=2(x+1)" + el + " i operant arribam a l'explícita " + bl + "y=2x+1" + el + "."
        },
        {
            id: 1,
            desc: "" + bl + "y=2x+1" + el
        },
        {
            id: 2,
            desc: "Un vector normal a la recta " + bl + "-x+2y+1=0" + el,
            feed: "El vector normal d'una recta expressada en forma general són directament els coeficients que acompanyen a la x i la y."
        },
        {
            id: 2,
            desc: "" + bl + "\\vec v(-1,2)" + el
        },
        {
            id: 3,
            desc: "Un vector director de la recta " + bl + "y=\\dfrac{1}{2}x-1" + el,
            feed: "De l'equació explícita sabem que el pendent és " + bl + "m=\\dfrac{1}{2}" + el + ", aleshores per cada 2 unitats que avançam en x, en pujam 1. Expressat com un vector és " + bl + "(2,1)" + el + "."
        },
        {
            id: 3,
            desc: "" + bl + "\\vec v(2,1)" + el
        },
        {
            id: 4,
            desc: "Un vector director de la recta " + bl + "(x,y)=(-1,0)+t(1,2)" + el,
            feed: "El vector director en una recta en forma vectorial apareix multiplicant al paràmetre. En aquest cas " + bl + "(1,2)" + el
        },
        {
            id: 4,
            desc: '<img src="https://ibsuite.es/iedib/img/flipcards/fp0001.png" style="width:95%;margin-top:-22px;">'
        },
        {
            id: 5,
            desc: "Una recta paral·lela a " + bl + "\\dfrac{x+2}{1}=\\dfrac{y}{-1}" + el,
            feed: "D'aquesta recta en forma contínua, obtenim el vector director dels denominadors " + bl + "\\vec d (1,-1)" + el + ". D'aquest vector director calculam el pendent " + bl + "m=-1" + el + ". Llavors, ha d'ésser una recta que en forma explícita comenci per " + bl + "y=-x+\\cdots" + el + "."
        },
        {
            id: 5,
            desc: '<img src="https://ibsuite.es/iedib/img/flipcards/fp0002.png" style="width:95%;margin-top:-22px;">'
        },
        {
            id: 6,
            desc: "El resultat de l'operació " + bl + "2\\vec{u}-3\\vec{v}" + el + " essent " + bl + "\\vec{u}(-1,3)" + el + " i " + bl + "\\vec{v}(-1,2)" + el,
            feed: "En primer lloc multiplicam els escalars pels vectors " + bl + "2(-1,3)-3(-1,2)=(-2,6)-(-3,6)" + el + ". Finalment, efectuam la resta de vectors i trobam " + bl + "\\vec v(1,0)" + el + ". El resultat és un vector."
        },
        {
            id: 6,
            desc: "" + bl + "\\vec v(1,0)" + el
        },
        {
            id: 7,
            desc: "Un vector perpendicular al segment d'extrems " + bl + "A=(3,-2)" + el + " i " + bl + "B=(2,-1)" + el,
            feed: "En primer lloc determinam el vector fix " + bl + "\\vec{AB}=(-1,1)" + el + " que serà el vector director del segment. Per trobar un vector perpendicular a aquest, giram l'ordre de les components i canviam un único signe."
        },
        {
            id: 7,
            desc: "" + bl + "\\vec v(1,1)" + el
        },
        {
            id: 8,
            desc: "Un vector que tengui igual direcció a " + bl + "(12,-8)" + el + " però sentit oposat",
            feed: "Si dividim el vector entre l'escalar " + bl + "-4" + el + " trobam el vector " + bl + "\\vec v(-2,3)" + el + ". Atès que el factor és negatiu, assegura que tenen igual direcció i sentit contraris."
        },
        {
            id: 8,
            desc: "" + bl + "\\vec v(-2,3)" + el
        },
        {
            id: 9,
            desc: "L'equació de la recta que passa pels punts " + bl + "A=(0,0)" + el + " i " + bl + "B=(2,3)" + el,
            feed: "En primer lloc determinam el vector fix " + bl + "\\vec{AB}=(2,3)" + el + " que serà el vector director de la recta. En forma contínua aquest vector apareix en els denominadors de l'equació."
        },
        {
            id: 9,
            desc: "" + bl + "\\dfrac{x}{2}=\\dfrac{y}{3}" + el
        },
        {
            id: 10,
            desc: "Un vector de mòdul 5",
            feed: "El mòdul d'un vector és l'arrel quadrada de la suma de les seves components al quadrat. " + bl + "\\vec v|=\\sqrt{3^2+(-4^2)}=\\sqrt{25}=5" + el + "."
        },
        {
            id: 10,
            desc: "" + bl + "\\vec v(3,-4)" + el
        },
        {
            id: 11,
            desc: "Una recta perpendicular a " + bl + "x+y+2=0" + el,
            feed: "De l'equació general de la recta és fàcil obtenir el seu vector normal " + bl + "\\vec n(1,1)" + el + " (coeficients de x i y). La recta que es perpendicular a la donada tindrà com a vector director el mateix vector normal o qualsevol proporcional a ell. Fixem-nos que el vector " + bl + "(2,2)" + el + " és proporcional a " + bl + "(1,1)" + el + " per un factor 2."
        },
        {
            id: 11,
            desc: "" + bl + "(x,y)=(-1,0)+t(2,2)" + el
        },
        {
            id: 12,
            desc: "El resultat de l'operació " + bl + "\\vec{a}\\cdot \\left( \\vec{b} + \\vec{c}\\right)" + el + " essent " + bl + "\\vec{a}(2,-1)" + el + ", " + bl + "\\vec{b}(2,1)" + el + ", " + bl + " \\vec{c}(-3,-2)" + el,
            feed: "En primer lloc efectuam la suma de vectors " + bl + "(2,-1)\\cdot (-1,-1)" + el + ". A continuació feim el producte escalar " + bl + "(2,-1)\\cdot (-1,-1)=-2+(-1)\\cdot(-1)=-2+1=-1" + el + ". El resultat és un escalar."
        },
        {
            id: 12,
            desc: "L'escalar " + bl + "-1" + el
        }
    ];

    // Add bind pattern and guard
    window.IB = window.IB || {};
    window.IB.sd = window.IB.sd || {};
    window.IB.sd.flipcards = {
        bind: function () {
            var gameEl = document.querySelector(".fc_game");
            if (gameEl && !gameEl.getAttribute('data-active')) {
                gameEl.setAttribute('data-active', '1');
                Memory.init(cards);
            }
        }
    };

    window.IB.sd.flipcards.bind();

})();