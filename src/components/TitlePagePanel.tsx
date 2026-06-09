import type { ScreenplayTitlePage } from '../types';

interface TitlePagePanelProps {
	titlePage: ScreenplayTitlePage;
	documentTitle: string;
	authorName: string;
	isDark?: boolean;
	onChange: (titlePage: Partial<ScreenplayTitlePage>) => void;
}

export function TitlePagePanel({
	titlePage,
	documentTitle,
	authorName,
	isDark = false,
	onChange,
}: TitlePagePanelProps) {
	const darkClass = isDark ? 'script-title-page--dark' : '';

	return (
		<section aria-label="Title page" className={`script-title-page ${darkClass}`}>
			<div className="script-title-page__title-block">
				<input
					aria-label="Title page title"
					className="script-title-page__title"
					placeholder={documentTitle || 'UNTITLED'}
					spellCheck={false}
					value={titlePage.title}
					onChange={(event) => onChange({ title: event.target.value })}
				/>
				<p className="script-title-page__credit-label">written by</p>
				<input
					aria-label="Written by"
					className="script-title-page__author"
					placeholder={authorName || 'Your Name'}
					spellCheck={false}
					value={titlePage.writtenBy}
					onChange={(event) => onChange({ writtenBy: event.target.value })}
				/>
			</div>
			<div className="script-title-page__contact-block">
				<input
					aria-label="Email"
					className="script-title-page__email"
					placeholder="your.email@example.com"
					spellCheck={false}
					type="email"
					value={titlePage.email}
					onChange={(event) => onChange({ email: event.target.value })}
				/>
				<input
					aria-label="Phone"
					className="script-title-page__phone"
					placeholder="(555) 123-4567"
					spellCheck={false}
					type="tel"
					value={titlePage.phone}
					onChange={(event) => onChange({ phone: event.target.value })}
				/>
			</div>
			<input
				aria-label="Draft date"
				className="script-title-page__draft-date"
				placeholder="Draft date"
				spellCheck={false}
				value={titlePage.draftDate}
				onChange={(event) => onChange({ draftDate: event.target.value })}
			/>
		</section>
	);
}
