(function () {
  var COMPONENT_NAME = "tiles";
  
  if (window.IB.sd[COMPONENT_NAME]) {
    console.warn("Warning: " + COMPONENT_NAME + " loaded twice.");
    if (window.IB.sd[COMPONENT_NAME].bind) {
      window.IB.sd[COMPONENT_NAME].bind();
    }
    return;
  }

  var createElement = function (tag, className, inner) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (inner) el.innerHTML = inner;
    return el;
  };

  var Tile = function (tileContainer, sectionsContainer, title, targetId) {
    var self = this;
    this.active = false;
    this.tileContainer = tileContainer;
    this.sectionsContainer = sectionsContainer;
    this.targetId = targetId;

    this.el = createElement('div', 'pw-tile');
    this.el.dataset.target = targetId;
    
    this.starEl = createElement('div', 'pw-tile-star');
    this.titleEl = createElement('p', 'pw-tile-title', title);
    
    this.el.appendChild(this.starEl);
    this.el.appendChild(this.titleEl);
    this.tileContainer.appendChild(this.el);

    this._clickHandler = function () {
      self.toggle();
    };
    this.el.addEventListener('click', this._clickHandler);
  };

  Tile.prototype.toggle = function () {
    this.active = !this.active;
    
    // Close other sections and deactivate other tiles
    var allLi = this.sectionsContainer.querySelectorAll('li');
    for (var i = 0; i < allLi.length; i++) {
        var li = allLi[i];
        if (li.classList.contains('pw-tiles-appear')) {
          li.classList.remove('pw-tiles-appear');
          li.classList.add('pw-tiles-disappear');
        }
    }

    var allTiles = this.tileContainer.querySelectorAll('.pw-tile');
    for (var j = 0; j < allTiles.length; j++) {
        allTiles[j].classList.remove('pw-tile-active');
    }

    if (this.active) {
      var h3El = this.sectionsContainer.querySelector('h3[data-target="' + this.targetId + '"]');
      if (h3El) {
        var liEl = h3El.parentNode;
        liEl.style.display = "";
        liEl.classList.remove('pw-tiles-disappear');
        liEl.classList.add('pw-tiles-appear');
        this.el.classList.add('pw-tile-active');
      }
    }
  };

  Tile.prototype.setSeverity = function (type) {
    if (type === 'important') {
      this.starEl.innerHTML = '<i class="fas fa-star" title="Recomanat"></i>';
      this.el.classList.add('pw-tile-important');
    } else {
      this.starEl.innerHTML = '';
      this.el.classList.remove('pw-tile-important');
    }
  };

  Tile.prototype.dispose = function() {
    this.el.removeEventListener('click', this._clickHandler);
  };

  var TilesSection = function (container) {
    this.container = container;
    this.tileContainer = createElement('div', 'pw-tiles-panel');
    container.parentNode.insertBefore(this.tileContainer, container);

    this.sectionElems = container.querySelectorAll('li > h3[data-target]');
    this.sections = {};

    for (var i = 0; i < this.sectionElems.length; i++) {
        var h3 = this.sectionElems[i];
        h3.parentNode.style.display = "none";
        var targetId = h3.getAttribute("data-target");
        if (targetId) {
          var tile = new Tile(this.tileContainer, container, h3.innerHTML, targetId);
          this.sections[targetId] = tile;
        }
    }
    
    this.id = "sd_" + Math.random().toString(36).substring(2, 11);
  };

  TilesSection.prototype.autoCollapse = function () {
    var ds = this.container.dataset;
    if (!ds.idQuizz) return;

    var tree = window.IB && window.IB.iapace && window.IB.iapace._tree && 
               window.IB.iapace._tree[window.IB.iapace.coursename || 'tal_alg'] &&
               window.IB.iapace._tree[window.IB.iapace.coursename || 'tal_alg'].ia;
    if (!tree) return;

    var data = tree[ds.idQuizz];
    if (!data || !ds.collapse) return;

    var rules = ds.collapse.split(";");
    var firstDisplayed = false;

    for (var i = 0; i < rules.length; i++) {
      var ruleParts = rules[i].split(":");
      if (ruleParts.length < 2) continue;
      
      var secname = ruleParts[0].trim();
      var conditions = ruleParts[1].trim().split("+");
      var fulfilled = true;
      
      for (var j = 0; j < conditions.length; j++) {
          if ((data.preguntes[conditions[j].trim()] || 0) < 5) {
              fulfilled = false;
              break;
          }
      }

      if (!fulfilled) {
        this.setSeverity('important', '#' + secname);
        if (!firstDisplayed) {
          firstDisplayed = this.toggle('#' + secname);
        }
      }
    }
  };

  TilesSection.prototype.toggle = function (targetId) {
    if (this.sections[targetId]) {
      this.sections[targetId].toggle();
      return true;
    }
    return false;
  };

  TilesSection.prototype.setSeverity = function (type, targetId) {
    if (targetId) {
      if (this.sections[targetId]) {
          this.sections[targetId].setSeverity(type);
      }
    } else {
      var keys = Object.keys(this.sections);
      for (var i = 0; i < keys.length; i++) {
          this.sections[keys[i]].setSeverity(type);
      }
    }
  };

  TilesSection.prototype.dispose = function() {
    var keys = Object.keys(this.sections);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      // Reset displays
      for (var j = 0; j < this.sectionElems.length; j++) {
        if (this.sectionElems[j].getAttribute('data-target') === key) {
          this.sectionElems[j].parentNode.style.display = "";
          break;
        }
      }
      this.sections[key].dispose && this.sections[key].dispose();
    }
    this.container.dataset.active = "";
    if (this.tileContainer && this.tileContainer.parentNode) {
      this.tileContainer.parentNode.removeChild(this.tileContainer);
    }
  };

  var alias = { inst: {} };
  window.IB.sd[COMPONENT_NAME] = alias;

  alias.bind = function () {
    var sectionElems = document.querySelectorAll('ul[role="tiles"]');
    for (var i = 0; i < sectionElems.length; i++) {
      var elem = sectionElems[i];
      if (elem.dataset.active === "1") continue;
      elem.dataset.active = "1";
      var inst = new TilesSection(elem);
      alias.inst[inst.id] = inst;
      
      if (elem.dataset.idQuizz) {
        inst.autoCollapse();
      }
    }
  };

  alias.unbind = function () {
    var keys = Object.keys(alias.inst);
    for (var i = 0; i < keys.length; i++) {
      alias.inst[keys[i]].dispose();
    }
    alias.inst = {};
  };

  alias.bind();
}());
