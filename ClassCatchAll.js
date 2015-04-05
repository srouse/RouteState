(function()
{
	var removeClass = jQuery.fn.removeClass;
	var hasClass    = jQuery.fn.hasClass;

	var wildcardRE = /([a-z0-9\-_]*\*[a-z0-9\-_]*)+/ig;
	var wildcardReplace = '[a-z0-9\\-_]+';

	function wildcardCheck(className)
	{
		return typeof className == 'string' && className.indexOf('*') > -1;
	}

	jQuery.fn.removeClass = function(className)
	{
		if(wildcardCheck(className))
		{
			var RE = [];
			var wildcards = [];
			
			className = className.replace(wildcardRE, function(match)
			{
				wildcards.push(match);
				return '';
			});

			for(var i = 0; i < wildcards.length; i++)
			{
				var wildcard = wildcards[i];
				RE.push('(' + wildcard.replace('*', wildcardReplace) + ')');
			}

			RE = new RegExp(RE.join('|'), 'ig');

			this.each(function()
			{
				this.className = this.className.replace(RE, '');
			});
		}

		return removeClass.call(this, className);
	};

	jQuery.fn.hasClass = function(className)
	{
		if(wildcardCheck(className))
		{
			var RE = new RegExp(className.replace('*', wildcardReplace), 'ig');

			var result = false;

			this.each(function()
			{
				if(RE.test(this.className)) result = true;
			});

			return result;
		}
		else
		{
			return hasClass.call(this, className);
		}
	};

}());