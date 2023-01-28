(function(){

	console.log('checkSystemRequirements');
	console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));
	
	ZoomMtg.setZoomJSLib('https://source.zoom.us/2.3.5/lib', '/av');
	
    // it's option if you want to change the WebSDK dependency link resources. setZoomJSLib must be run at first
    // if (!china) ZoomMtg.setZoomJSLib('https://source.zoom.us/1.7.7/lib', '/av'); // CDN version default
    // else ZoomMtg.setZoomJSLib('https://jssdk.zoomus.cn/1.7.7/lib', '/av'); // china cdn option 
    // ZoomMtg.setZoomJSLib('http://localhost:9999/node_modules/@zoomus/websdk/dist/lib', '/av'); // Local version default, Angular Project change to use cdn version
    
	ZoomMtg.preLoadWasm();
    ZoomMtg.prepareJssdk();
    
	var meetingid = null;
    var meetingpassword = '';
    var terminalName = 'KloudDisplay';
    var enableaudio = false;
    var enablevideo = false;
    var API_KEY = '58AfEWgGRuuE4cHkunLqeQ';
  
    /**
     * NEVER PUT YOUR ACTUAL API SECRET IN CLIENT SIDE CODE, THIS IS JUST FOR QUICK PROTOTYPING
     * The below generateSignature should be done server side as not to expose your api secret in public
     * You can find an eaxmple in PHP here: https://gist.github.com/joshuawoodward/7574df3df9a089e2663582a2cf9f188b
     */
    var API_SECRET = 'oaa1GOxfRsD0j8Wtyhuncd5lE9Yud6puLwNS';
  
    document.getElementById('join_meeting').addEventListener('click', function(e){
  
        e.preventDefault();
  
        /*
        if(!this.form.checkValidity()){
            alert("Enter Name and Meeting Number");
            return false;
        }
        */
  
        var meetConfig = {
          apiKey: API_KEY,
          apiSecret: API_SECRET,
          meetingNumber: parseInt(document.getElementById('meeting_number').value),
          userName: document.getElementById('display_name').value,
          passWord: document.getElementById('meeting_pwd').value,
          email: "",
          leaveUrl: "https://www.kloudspot.com",
          role: 0	
        };
  
  
        var signature = ZoomMtg.generateSignature({
            meetingNumber: meetConfig.meetingNumber,
            apiKey: meetConfig.apiKey,
            apiSecret: meetConfig.apiSecret,
            role: meetConfig.role,
            success: function(res){
                console.log(res.result);
                console.log('Signature generated for the zoom meeting');
            }
        });
  
        console.log('Initializing Zoom meeting');
        ZoomMtg.init({
           leaveUrl: meetConfig.leaveUrl,
            debug: true,
            isSupportAV: true,
            success: function () {
            	console.log('Zoom meeting init complete');
                ZoomMtg.join(
                    {
                        meetingNumber: meetConfig.meetingNumber,
                        userName: meetConfig.userName,
                        passWord: meetConfig.passWord,
                        signature: signature,
                        apiKey: meetConfig.apiKey,
                        success: function(res){
                        	console.log('join meeting success');
                            document.getElementById('nav-tool').style.display = 'none';
                            
                            
                            //Join by audio
                            var pcJoinTimeout = setInterval(function() {
                            	console.log('Checking if Join button is ready.. : '+$("#pc-join").text().toLowerCase());
                                $("#mic-icon").click();
                                $(".joinWindowBtn").click();
                                // $(".send-video-container__btn").click();
                            	if($("#pc-join").text()=='') {
                            		if(pcJoinTimeout) {
                            			clearInterval(pcJoinTimeout);
                            		}
                            		return;
                            	} else if($("#pc-join").text()!=='' && $("#pc-join").text().toLowerCase().indexOf("join")>-1) {
                            		//console.log('Triggering a click on Join Audio button');
                            		$("#pc-join").trigger('click');
                            	} else {
                            		if(pcJoinTimeout) {
                            			clearInterval(pcJoinTimeout);
                            		}
                            		console.log('Clearing pcJoinTimeout interval');
                            	}
                            }, 2000);
                            ZoomMtg.inMeetingServiceListener('onUserLeave', function (data) {
                                console.log(data);
                            });
                            
                            // ZoomMtg.inMeetingServiceListener('onUserIsInWaitingRoom', function (data) {
                            //     console.log(data);
                            // });
                            
                            ZoomMtg.inMeetingServiceListener('onMeetingStatus', function (data) {
                                // {status: 1(connecting), 2(connected), 3(disconnected), 4(reconnecting)}
                                console.log(data);
                                if(data.meetingStatus == 3) { // meeting disconnected handler
                                    var params = new URLSearchParams(window.location.search);
                                    var cid = params.get('cid');
                                    var displayId = params.get('displayId');
                                    console.log("Status" ,data.status);
                                    var webPath=window.location.href.split("?")[0].split("/"); 
                                    webPath.pop();
                                    let newImgPath=webPath.join("/");
                                    $.ajax(
                                        {
                                            type: "POST",
                                            url: newImgPath+"/display/endEvent/" + cid,
                                            data: JSON.stringify({displayId: displayId}),
                                            contentType: "application/json; charset=utf-8",
                                            crossDomain: true,
                                            dataType: "json",
                                            success: function (data, status, jqXHR) {
                                                console.log("Display being redirected to original display");
                                            },
                                            error: function (jqXHR, status) {
                                                // error handler
                                                console.log(jqXHR);
                
                                            }
                                        })
                                }

                            });

                            // window.addEventListener('beforeunload', function (e) {
                            // 	//Leave meeting when window closes
                            // 	ZoomMtg.leaveMeeting();
                        	// });
                        	
                        },
                        error: function(res) {
                            console.log(signature);
                            console.log(meetConfig)
                            console.log(res);
                        }
                    }
                );
            },
            error: function(res) {
                console.log(res);
            }
        });
        /*
        ZoomMtg.init({
            leaveUrl: meetConfig.leaveUrl,
            debug: true,
            isSupportAV: true,
            success: function () {
            	console.log('Zoom meeting init complete');
                ZoomMtg.join(
                    {
                        meetingNumber: meetConfig.meetingNumber,
                        userName: meetConfig.userName,
                        passWord: meetConfig.passWord,
                        userEmail: meetConfig.email,
                        signature: signature,
                        apiKey: meetConfig.apiKey,
                        success: function(res){
                            console.log('join meeting success');
                            document.getElementById('nav-tool').style.display = 'none';
                            
                            //Join by audio
                            var pcJoinTimeout = setInterval(function() {
                            	//console.log('Checking if Join button is ready.. : '+$("#pc-join").text().toLowerCase());
                            	if($("#pc-join").text()=='') {
                            		return;
                            	} else if($("#pc-join").text()!=='' && $("#pc-join").text().toLowerCase().indexOf("join")>-1) {
                            		//console.log('Triggering a click on Join Audio button');
                            		$("#pc-join").trigger('click');
                            	} else {
                            		clearInterval(pcJoinTimeout);
                            		//console.log('Clearing pcJoinTimeout interval');
                            	}
                            }, 2000);
                            
                            $(window).unload(function() {
                            	//Leave meeting when window closes
                            	ZoomMtg.leaveMeeting();
                        	});
                        },
                        error: function(resp) {
                        	console.log('error');
                        	console.log(resp);
                        }
                    }
                );
  
            }
        });
        */
        
        //Mute audio and video controls accordingly..
        setInterval(function() {
            console.log("calling audio video controls");
            $(".zm-btn").click();
            //$(".joinWindowBtn").click();
            $(".join-audio-by-voip__join-btn").click();
            // $(".join-dialog__close").click();
         	$(".join-audio-container").each(function() {
        		//console.log('Checking AV settings');
        		//If audio or video are disabled, enable them if the corresponding controls are set
        		if(($(this).find(".img-unmute").length>0
        				|| $(this).find(".img-unmute-animation").length>0)
        				&& enableaudio) {
        			//console.log('Audio Muted. Enabling..');
        			$(this).trigger('click');
        		} 
        		if($(this).find(".img-start-video").length>0 && enablevideo) {
        			//console.log('Video Muted. Enabling..');
        			$(this).trigger('click');
        		}
        		//If audio or video are enabled, disable (mute) them if the corresponding controls are set
        		if(($(this).find(".img-mute").length>0
        				|| $(this).find(".img-mute-animation").length>0)
        				&& !enableaudio) {
        			//console.log('Muting Audio..');
        			$(this).trigger('click');
        		} 
        		if($(this).find(".img-stop-video").length>0 && !enablevideo) {
        			//console.log('Muting Video..');
        			$(this).trigger('click');
        		}
        	});
        }, 5000);
  
        //Run a timer to see if the meeting ended or the user has been removed
        setInterval(function() {
        	if($(".zm-modal-legacy").length>0) {
        		var msg = $(".zm-modal-body-content .content").text();
        		if(msg.indexOf("ended")>=1) {
        			$(".zm-modal-legacy .zm-modal-footer button.zm-btn--primary").trigger('click');
        			$(".intro-msg h2").html('<span class="glyphicon glyphicon glyphicon-refresh gly-spin"></span>&nbsp;&nbsp;'+$(".zm-modal-body-content .content").text());
        		} else if(msg.indexOf("removed")>=1) {
        			$(".zm-modal-legacy .zm-modal-footer button.zm-btn--primary").trigger('click');
        			$(".intro-msg h2").html('<span class="glyphicon glyphicon glyphicon-refresh gly-spin"></span>&nbsp;&nbsp;'+$(".zm-modal-body-content .content").text());
        		} else {
        			$(".zm-modal-legacy .zm-modal-footer button.zm-btn--default").trigger('click');
        			$(".intro-msg h2").html('<span class="glyphicon glyphicon glyphicon-refresh gly-spin"></span>&nbsp;&nbsp;'+$(".zm-modal-body-content .content").text());
        		}
        		console.log($(".zm-modal-body-content .content").text());
        	}
        }, 10000);
    });
    
    setTimeout(function() {
        $(".zm-btn").click()

        $.extend({
            getUrlVars: function(){
                var vars = [], hash;
                var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
                for(var i = 0; i < hashes.length; i++)
                {
                    hash = hashes[i].split('=');
                    vars.push(hash[0]);
                    vars[hash[0]] = hash[1];
                }
                return vars;
            },
            getUrlVar: function(name){
                return $.getUrlVars()[name];
            }
        });
        meetingid = $.getUrlVar('meetingid');
        meetingpassword = $.getUrlVar('meetingpassword');
        terminalName = $.getUrlVar('name') || 'KloudDisplay';
        enablevideo = $.getUrlVar('enablevideo')==='true';
        enableaudio = $.getUrlVar('enableaudio')==='true';
        
        $("#meeting_number").val(meetingid);
        $("#meeting_pwd").val(meetingpassword);
        $("#display_name").val(decodeURIComponent(terminalName));
    	$("#join_meeting").trigger('click');
    }, 1000);
  
})();
