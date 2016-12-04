function genDivs(rowsNum) {
	var html = [];
	for(var i = 0; i < rowsNum; i++) {
		html.push('<div class="row">this is row ' + i + '</div>');
	}
	html = html.join('');
	return html;
}

function init() {
	var is = new InfiniteScroll({
		container: document.getElementById('app')
	})
	for (var i = 0; i < 50; i++) {
		var html = genDivs(10);
		is.append(html);
	}
}

init();

