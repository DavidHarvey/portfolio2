Zepto(function($) {
  //Cached elements
  var $body = $('body');
  var $window = $(window);
  var $mainNav = $('#main-nav');
  var $navLogo = $mainNav.children('.logo');

  var $sections = $('.section');
  var $sectionIntro = $sections.filter('[data-section="home"]');
  var $sectionWork = $sections.filter('[data-section="work"]');
  var $sectionSkills = $sections.filter('[data-section="skills"]');
  var $sectionContact = $sections.filter('[data-section="contact"]');

  var $introParticles = $('#intro-particles');
  var $introMiddle = $sectionIntro.children('.middle');
  var $introLogo = $introMiddle.children('.logo');

  var $skillsParticles = $('#skills-particles');

  var $contactForm = $sectionContact.find('form');
  var $contactEmail = $contactForm.find('#contact-email');
  var $contactMessage = $contactForm.find('#contact-message');

  //Constants that aren't elements...
  var contactMessageMin = parseInt($contactMessage.attr('minlength'));
  var contactMessageMax = parseInt($contactMessage.attr('maxlength'));

  //State tracking
  var initialLoad = true;
  var prevY = null;
  var scrollInElements = [];
  var previousSection = '';
  var currentSection = '';
  var preventScrollSectionChange = true;
  var preventScrollSectionAnim = false;
  var contactSending = false;


  /**********************************
   * Methods
   **********************************/

  function getScrollPos() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  //adapted from https://stackoverflow.com/questions/21474678/scrolltop-animation-without-jquery
  function scrollTo(to, duration, cb) {
    var cosParameter = (getScrollPos() - to) / 2,
      scrollCount = 0,
      oldTimestamp  = window.performance.now();

    function step(newTimestamp) {
      scrollCount += Math.PI / (duration / (newTimestamp - oldTimestamp));

      if (scrollCount >= Math.PI) {
        window.scrollTo(0, to); //ensures we actually end up at the right place, not slightly off it

        if ($.isFunction(cb)) {
          cb();
        }

        return;
      }

      window.scrollTo(0, Math.round(to + cosParameter + cosParameter * Math.cos(scrollCount)));
      oldTimestamp = newTimestamp;
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function gotoPage(page) {
    history.replaceState({page: page}, '', page === 'home' ? '/' : page);
    $window.trigger('popstate');
  }

  function getSectionElement(sectionName) {
    return $sections.filter('[data-section="'+sectionName+'"]');
  }

  function activateNavItem() {
    var $item = $mainNav.find('.page-links a[href="/'+ currentSection +'"]');
    $mainNav.find('.page-links a').not($item).removeClass('active');
    $item.addClass('active');
  }

  function inViewport($el) {
    var elH = $el.height(),
      H   = window.innerHeight,
      r   = $el[0].getBoundingClientRect(), t=r.top, b=r.bottom;
    return Math.max(0, t>0? Math.min(elH, H-t) : (b<H?b:H));
  }

  function isVisible(currentY, viewHeight, $el, offset) {
    return (currentY + viewHeight) > $el.offset().top + offset;
  }

  function registerScrollInEvent($el, offset) {
    scrollInElements.push({
      $el: $el,
      offset: offset ? offset : 0
    });
  }

  function afterPopScroll() {
    preventScrollSectionChange = false;
  }

  function ContactValidationException(message) {
    this.message = message;
  }

  function validateContactEmail() {
    var email = $contactEmail.val();

    if (email.length < 3) {
      throw new ContactValidationException();
    }
  }

  function validateContactMessage() {
    var message = $contactMessage.val();

    if (message.length < contactMessageMin) {
      throw new ContactValidationException('Your message is a tad too short! Please enter at least ' +
                                            contactMessageMin + ' characters.');
    }

    if (message.length > contactMessageMax) {
      throw new ContactValidationException('Your message is a bit too long! Please keep it under ' +
                                            contactMessageMin + ' characters.');
    }
  }

  function toggleErrorTip(mode, $el, text) {
    var $parent = $el.parent();

    if (mode === 'show') {
      $parent.removeClass('valid').addClass('error');
      $parent.find('.error-tip').text(text);
    } else if (mode === 'hide') {
      $parent.removeClass('error');
    }
  }


  /**********************************
   * Events
   **********************************/

  $window.on('scroll', function(e, force) {
    var currentY = getScrollPos();
    //Only update on vertical scroll change
    if (prevY !== currentY || force) {
      var viewHeight = document.documentElement.clientHeight;

      if (!preventScrollSectionChange && !initialLoad) {
        //Change url if a new section has the majority of screen height
        $sections.each(function (i, el) {
          var $el = $(el);
          var section = $el.data('section');
          if (inViewport($el) > viewHeight / 2 && currentSection !== section) {
            preventScrollSectionAnim = true;
            gotoPage(section);
          }
        });
      }

      //Toggle a dark bg on nav
      if (currentY >= $introMiddle.offset().top && !$mainNav.hasClass('has-bg')) {
        $mainNav.addClass('has-bg');
      } else if (currentY < $introMiddle.offset().top && $mainNav.hasClass('has-bg')) {
        $mainNav.removeClass('has-bg');
      }

      //Show logo in nav if we scrolled passed the one in intro
      if (currentY >= $introLogo.offset().top + $introLogo.height() && !$mainNav.hasClass('has-logo')) {
        $navLogo.attr('aria-hidden', false);
        $mainNav.addClass('has-logo');
      } else if (currentY < $introLogo.offset().top + $introLogo.height() && $mainNav.hasClass('has-logo')) {
        $navLogo.attr('aria-hidden', true);
        $mainNav.removeClass('has-logo');
      }

      //Don't need to animate intro particles if we can't see them!
      if (introParticles) {
        var visible = currentY < $introParticles.offset().top + $introParticles.height();
        if (!introParticles.active && visible) {
          particlesJS.resume(introParticles);
        } else if (introParticles.active && !visible) {
          particlesJS.pause(introParticles);
        }
      }

      //Same with the skills particles
      if (skillsParticles) {
        var visible = currentY + viewHeight > $skillsParticles.offset().top &&
                      currentY < $skillsParticles.offset().top + $skillsParticles.height();
        if (!skillsParticles.active && visible) {
          particlesJS.resume(skillsParticles);
        } else if (skillsParticles.active && !visible) {
          particlesJS.pause(skillsParticles);
        }
      }

      //Handle elements that have scrolled into view
      var s = scrollInElements.length;
      while (s--) {
        var scrollIn = scrollInElements[s];
        if (currentY + viewHeight >= $body.height() || isVisible(currentY, viewHeight, scrollIn.$el, scrollIn.offset)) {
          scrollIn.$el.addClass('active');
          scrollInElements.splice(scrollInElements.indexOf(scrollIn), 1);
        }
      }

      prevY = currentY;
    }
  });

  $('a[href^="/"]').not('[href*="."]').not('[target="_blank"]').click(function() {
    gotoPage($(this).attr('href').substring(1));
    return false;
  });

  $window.on('popstate', function() {
    var page = history.state && history.state.page ? history.state.page : location.pathname.substring(1);
    previousSection = currentSection;
    currentSection = page !== '' ? page : 'home';

    var $target = getSectionElement(currentSection);
    activateNavItem();

    if (!preventScrollSectionAnim) {
      if ($target.length > 0) {
        preventScrollSectionChange = true;

        if (initialLoad) {
          if ($target.offset().top) {
              window.scrollTo(0, $target.offset().top);
          }
          afterPopScroll();

        } else {
          var scrollAnimComplete = false;
          scrollTo($target.offset().top, 250, function() {
            if (!scrollAnimComplete) {
              scrollAnimComplete = true;
              afterPopScroll();
            }
          });
        }
      }
    }

    preventScrollSectionAnim = false;
  });


  //Contact form stuff

  $contactEmail.on('blur keypress', function(e) {
    var $parent = $contactEmail.parent();
    if (e.type === 'keypress' && !$parent.hasClass('error')) {
      return true;
    }

    try {
      validateContactEmail();
      toggleErrorTip('hide', $contactEmail);
      $parent.addClass('valid');
    } catch (e) {
      if (e instanceof ContactValidationException) {
        toggleErrorTip('show', $contactEmail, 'Please enter a valid email address.');
      }
    }
  });

  $contactMessage.on('blur keypress', function(e) {
    var $parent = $contactMessage.parent();
    if (e.type === 'keypress' && !$parent.hasClass('error')) {
      return true;
    }

    try {
      validateContactMessage();
      toggleErrorTip('hide', $contactMessage);
      $parent.addClass('valid');
    } catch (e) {
      if (e instanceof ContactValidationException) {
        toggleErrorTip('show', $contactMessage, e.message);
      }
    }
  });

  $contactForm.find('.alert').on('click', '.close', function() {
    $(this).closest('.alert').removeClass('active');
    $contactForm.removeClass('has-alert');
  });

  $sectionContact.find('form').on('submit', function(e) {
    e.preventDefault();
    var errors = false;

    try {
      validateContactEmail();
      toggleErrorTip('hide', $contactEmail);
    } catch (e) {
      if (e instanceof ContactValidationException) {
        errors = true;
        toggleErrorTip('show', $contactEmail, 'Please enter a valid email address.');
      }
    }

    try {
      validateContactMessage();
      toggleErrorTip('hide', $contactMessage);
    } catch (e) {
      if (e instanceof ContactValidationException) {
        errors = true;
        toggleErrorTip('show', $contactMessage, e.message);
      }
    }

    if (errors || contactSending) {
      return false;
    }

    //submit form via ajax
    contactSending = true;
    $contactForm.find('button[type="submit"]').attr('disabled', 'disabled').addClass('loading');

    $.ajax({
      type: 'POST',
      url: $contactForm.attr('action'),
      dataType: 'json',
      data: {
        ajax: true,
        name: $contactForm.find('#contact-name').val(),
        email: $contactEmail.val(),
        message: $contactMessage.val(),
        url: $contactForm.find('#contact-url').val()
      },
      complete: function() {
        //Ensure the form always unlocks regardless of error state
        $contactForm.find('button[type="submit"]').removeAttr('disabled').removeClass('loading');
        $contactForm.children('fieldset').removeClass('valid error');
        contactSending = false;
      },
      success: function(res) {
        if (res.error) {
          //Something broke on the server welp
          $contactForm.addClass('has-alert');
          $contactForm.find('.send-error').addClass('active')
            .find('.error-code').text(res.code ? '(Err: ' + res.code + ')' : '');

        } else if (res.errors) {
          //User got validation errors (bypassed the html/js rules?)
          $.each(res.errors, function (type, message) {
            if (type === 'email') {
              toggleErrorTip('show', $contactEmail, message);
            } else if (type === 'message') {
              toggleErrorTip('show', $contactMessage, message);
            }
          });

        } else if (res.success) {
          //Message actually went through!
          $contactForm.get(0).reset();
          $contactForm.addClass('has-alert');
          $contactForm.find('.send-success').addClass('active');
        }
      },
      error: function() {
        //Something broke on the server welp
        $contactForm.addClass('has-alert');
        $contactForm.find('.send-error').addClass('active')
          .find('.error-code').text('(Err: 99)');
      }
    });
  });


  /**********************************
   * Scroll-in visibility effects
   **********************************/

  $sections.not($sectionIntro).find('header .title').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionWork.find('.showcase .item .logo').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionWork.find('.showcase .item .info').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionSkills.find('article > p, .resume').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionSkills.find('article > ul li').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionContact.find('article > p, form button[type="submit"]').each(function(i, el) {
    registerScrollInEvent($(el));
  });

  $sectionContact.find('form > fieldset').each(function(i, el) {
    registerScrollInEvent($(el), ($(el).height() / 4) * -1);
  });

  $sectionContact.find('.social a').each(function(i, el) {
    registerScrollInEvent($(el));
  });


  /**********************************
   * Init
   **********************************/

  var introParticles = particlesJS('intro-particles', window.introParticlesConf);
  var skillsParticles = particlesJS('skills-particles', window.skillsParticlesConf);

  //ghetto do-it-yourself ladda.js
  $('.dh-btn.loading-enabled').each(function(i, el) {
    var $el = $(el);
    var html = $el.html();
    $el.empty();
    $el.append('<span class="before-load">' + html + '</span>')
      .append('<span class="loader"><i class="icon-spinner" aria-hidden="true"></i></span>');
  });

  $sectionIntro.addClass('active');

  $window.trigger('popstate');
  $window.trigger('scroll');

  initialLoad = false;
});