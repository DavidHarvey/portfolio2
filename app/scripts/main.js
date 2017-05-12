$(document).ready(function () {
  //Cached elements
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
  var prevY = 0;
  var prevW = 0;
  var scrollPoints = {};
  var scrollInElements = [];
  var previousSection = '';
  var currentSection = '';
  var preventScrollSectionChange = true;
  var preventScrollSectionAnim = false;
  var contactSending = false;


  /**********************************
   * Methods
   **********************************/

  function gotoPage(page) {
    history.replaceState({page: page}, '', page === 'home' ? '/' : page);
    $(window).trigger('popstate');
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
    var elH = $el.outerHeight(),
      H   = window.innerHeight,
      r   = $el[0].getBoundingClientRect(), t=r.top, b=r.bottom;
    return Math.max(0, t>0? Math.min(elH, H-t) : (b<H?b:H));
  }

  function registerScrollInEvent($el, handler, offset) {
    scrollInElements.push({
      pos: 99999999,
      offset: offset ? offset : 0,
      $el: $el,
      handler: handler
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

  $(window).scroll(function() {
    var currentY = $(window).scrollTop();
    //Only update on vertical scroll change
    if (prevY !== currentY) {
      if (!preventScrollSectionChange && !initialLoad) {
        //Change url if a new section has the majority of screen height
        $sections.each(function (i, el) {
          var $el = $(el);
          var section = $el.data('section');
          if (inViewport($el) > window.innerHeight / 2 && currentSection !== section) {
            preventScrollSectionAnim = true;
            gotoPage(section);
          }
        });
      }

      //Toggle a dark bg on nav
      if (currentY >= scrollPoints.navBg && !$mainNav.hasClass('has-bg')) {
        $mainNav.addClass('has-bg');
      } else if (currentY < scrollPoints.navBg && $mainNav.hasClass('has-bg')) {
        $mainNav.removeClass('has-bg');
      }

      //Show logo in nav if we scrolled passed the one in intro
      if (currentY >= scrollPoints.navLogo && !$mainNav.hasClass('has-logo')) {
        $navLogo.attr('aria-hidden', false);
        $mainNav.addClass('has-logo');
      } else if (currentY < scrollPoints.navLogo && $mainNav.hasClass('has-logo')) {
        $navLogo.attr('aria-hidden', true);
        $mainNav.removeClass('has-logo');
      }

      //Don't need to animate intro particles if we can't see them!
      if (introParticles) {
        var visible = currentY < scrollPoints.introParticles;
        if (!introParticles.active && visible) {
          particlesJS.resume(introParticles);
        } else if (introParticles.active && !visible) {
          particlesJS.pause(introParticles);
        }
      }

      //Same with the skills particles
      if (skillsParticles) {
        var visible = currentY + window.innerHeight > scrollPoints.skillsParticlesTop &&
                      currentY < scrollPoints.skillsParticlesBottom;
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
        if ((currentY + window.innerHeight) > scrollIn.pos) {
          scrollIn.handler(scrollIn.$el);
          scrollInElements.splice(scrollInElements.indexOf(scrollIn), 1);
        }
      }

      prevY = currentY;
    }
  });

  $(window).resize(function() {
    var currentW = window.innerWidth;
    //Only update on width change
    if (prevW !== currentW) {
      //Update scroll detection points
      scrollPoints.navBg = $introMiddle.offset().top;
      scrollPoints.navLogo = $introLogo.offset().top + $introLogo.height();
      scrollPoints.introParticles = $introParticles.offset().top + $introParticles.height();
      scrollPoints.skillsParticlesTop = $skillsParticles.offset().top;
      scrollPoints.skillsParticlesBottom = scrollPoints.skillsParticlesTop + $skillsParticles.height();

      $.each(scrollInElements, function(key, scrollIn) {
        scrollIn.pos = scrollIn.$el.offset().top + scrollIn.offset;
      });

      prevW = currentW;
    }
  });

  $('a[href^="/"]').not('[href*="."]').not('[target="_blank"]').click(function() {
    gotoPage($(this).attr('href').substring(1));
    return false;
  });

  $(window).on('popstate', function() {
    var page = history.state && history.state.page ? history.state.page : location.pathname.substring(1);
    previousSection = currentSection;
    currentSection = page !== '' ? page : 'home';

    var $target = getSectionElement(currentSection);
    activateNavItem();

    if (!preventScrollSectionAnim) {
      if ($target.length > 0) {
        preventScrollSectionChange = true;

        if (initialLoad) {
          window.scrollTop = $target.offset().top;
          afterPopScroll();

        } else {
          var scrollAnimComplete = false;
          $('html, body').animate({
            scrollTop: $target.offset().top
          }, 250, function () {
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

    var post = $.post($contactForm.attr('action'), {
      name: $contactForm.find('#contact-name').val(),
      email: $contactEmail.val(),
      message: $contactMessage.val(),
      url: $contactForm.find('#contact-url').val()
    }, function (res) {
      res = $.parseJSON(res);

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
    });

    post.fail(function () {
      //Something broke on the server welp
      $contactForm.addClass('has-alert');
      $contactForm.find('.send-error').addClass('active')
        .find('.error-code').text('(Err: 99)');
    });

    post.always(function () {
      //Ensure the form always unlocks regardless of error state
      $contactForm.find('button[type="submit"]').removeAttr('disabled').removeClass('loading');
      $contactForm.children('fieldset').removeClass('valid error');
      contactSending = false;
    });
  });


  /**********************************
   * Scroll-in visibility effects
   **********************************/

  $sections.not($sectionIntro).find('> header .title').each(function(i, el) {
    registerScrollInEvent($(el), function($el) {
      $el.addClass('active');
    }, 100);
  });

  $sectionWork.find('.showcase .item .logo').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    }, 200);
  });

  $sectionWork.find('.showcase .item .info').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    });
  });

  $sectionSkills.find('article > p, .resume').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    });
  });

  $sectionSkills.find('article > ul li').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    });
  });

  $sectionContact.find('article > p, form button[type="submit"]').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    });
  });

  $sectionContact.find('form > fieldset').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    }, ($(el).outerHeight() / 4) * -1);
  });

  $sectionContact.find('.social a').each(function(i, el) {
    registerScrollInEvent($(el), function ($el) {
      $el.addClass('active');
    }, 50);
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
      .append('<span class="loader"><i class="fa fa-spinner fa-2x fa-spin fa-fw" aria-hidden="true"></i></span>');
  });

  $(window).trigger('resize');
  $(window).trigger('popstate');
  $(window).trigger('scroll');

  initialLoad = false;
});