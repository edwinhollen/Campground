'use strict';
var api_key = 'vatnajokull';
var isPlaying = false;
var playlist = [];
var currentTrackId = null;

Object.observe(playlist, function(changes){
    $('.playlist').html('');
    playlist.forEach(function(track){
        $('.playlist').append((Handlebars.compile($('#trackTemplate').html())(track)));
    });
});

var shuffleArray = function(d) {
    for (var c = d.length - 1; c > 0; c--) {
        var b = Math.floor(Math.random() * (c + 1));
        var a = d[c];
        d[c] = d[b];
        d[b] = a;
    }
    return d;
};

var Track = function(trackData, albumData, bandData){
    console.log(
        'New track', '\n',
        'Track data', trackData,
        'Album data', albumData,
        'Band data', bandData
    );

    this.track_id = trackData.track_id;
    this.album_id = trackData.album_id;
    this.band_id = trackData.band_id;

    this.track_title = trackData.title;
    this.track_streaming_url = trackData.streaming_url;
    this.track_url = trackData.url;
    this.album_url = albumData.url;
    this.album_title = albumData.title;
    this.album_art_small_url = albumData.small_art_url || null;
    this.album_art_large_url = albumData.large_art_url || null;

    this.band_url = bandData.url;
    this.band_name = bandData.name;
};

// API functions

var api_getUrlData = function(url, callback){
    $.getJSON(
        'http://api.bandcamp.com/api/url/1/info'+
        '?key='+api_key+
        '&callback=?'+
        '&url='+url
    ).success(function(data){
        callback(data);
    }).fail(function(){
        $('#statusMessage').html('Oops, Bandcamp failed to resolve that URL. Make sure you entered a track or album URL.');
    });
};

var api_getBandData = function(band_id, callback){
    $.getJSON(
        'http://api.bandcamp.com/api/band/3/info'+
        '?key='+api_key+
        '&callback=?'+
        '&band_id='+band_id
    ).success(function(data){
        callback(data);
    }).fail(function(){
        $('#statusMessage').html('Failed to retrieve band data.');
    });
};

var api_getAlbumData = function(album_id, callback){
    $.getJSON(
        'http://api.bandcamp.com/api/album/2/info'+
        '?key='+api_key+
        '&callback=?'+
        '&album_id='+album_id
    ).success(function(data){
        callback(data);
    }).fail(function(){
        $('#statusMessage').html('Failed to retrieve album data');
    });
};

var api_getTrackData = function(track_id, callback){
    $.getJSON(
        'http://api.bandcamp.com/api/track/3/info'+
        '?key='+api_key+
        '&callback=?'+
        '&track_id='+track_id
    ).success(function(data){
        callback(data);
    }).fail(function(){
        $('#statusMessage').html('Failed to retrieve track data');
    });
};

// Saving and loading

var loadPlaylist = function(){
    var savedPlaylist = JSON.parse(localStorage.playlist || '[]');
    if(savedPlaylist.length < 1){
        console.log('No saved playlist found');
        playlist = [];
    }else{
        console.log('Found saved playlist, loading');
        savedPlaylist.forEach(function(track){
            playlist.push(track);
        });
    }
};
var savePlaylist = function(){
    console.log('Saving playlist locally');
    localStorage.playlist = JSON.stringify(playlist);
};

// Manipulating the playlist
var play = function(){
    isPlaying = true;
    if(currentTrackId === null){
        currentTrackId = playlist[0].track_id;
    }
    $('[data-trackid="'+currentTrackId+'"] audio')[0].play();
};
var pause = function(){
    isPlaying = false;
    $('audio').each(function(){
        this.pause();
    });
};
var playPause = function(){
    if(!isPlaying){
        $('#btn_playPause').html('Pause');
        play();

    }else{
        $('#btn_playPause').html('Play');
        pause();
    }
};

var nextTrack = function(){
    // get key of current track
    for(var k in playlist){
        k = parseInt(k);
        console.log(k);
        if(playlist[parseInt(k)].track_id === currentTrackId){
            currentTrackId = (playlist[parseInt(k)+1] || playlist[0]).track_id;
            playPause();
            playPause();
            return;
        }
    }
};

var shufflePlaylist = function(){
    shuffleArray(playlist);
};

var addAlbumToPlaylist = function(album_id, bandData){
    //console.log('Adding album to playlist', album_id, bandData);
    // get album data
    api_getAlbumData(album_id, function(albumData){
        albumData.tracks.forEach(function(trackData){
            playlist.push(new Track(trackData, albumData, bandData));
        });
    });
};

var addTrackToPlaylist = function(track_id, bandData){
    //console.log('Adding track to playlist', track_id, bandData);
    // get track data
    api_getTrackData(track_id, function(trackData){
        // get album data
        api_getAlbumData(trackData.album_id, function(albumData){
            playlist.push(new Track(trackData, albumData, bandData));
        });
    });
};

// First contact

var getTrackOrAlbum = function(){
    var str = $('#inpt_trackOrAlbum').val().trim();
    api_getUrlData(str, function(urlData){
        if(urlData.band_id){
            // get band data
            api_getBandData(urlData.band_id, function(bandData){
                if(urlData.album_id){
                    addAlbumToPlaylist(urlData.album_id, bandData);
                }else if(urlData.track_id){
                    addTrackToPlaylist(urlData.track_id, bandData);
                }
            });
        }else{
            $('#statusMessage').html('Bandcamp rejected the URL');
        }
    });
};
